import { User } from "../models/user.data.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Function to check if current time matches user's posting time
const checkPostingTime = (userPostingTime) => {
  const now = new Date();
  const [hours, minutes] = userPostingTime.split(":");

  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  return utcHours === parseInt(hours) && utcMinutes === parseInt(minutes);
};

// Function to post question for a user
const postQuestionForUser = async (user) => {
  try {
    // Get class configs with active classroom codes
    const activeConfigs = user.settings?.classConfigs?.filter(
      config => (config.group6Code || config.group4Code) && config.folderId
    ) || [];
    
    if (activeConfigs.length === 0) {
      console.log(`User ${user.email} has no active class configurations. Skipping.`);
      return { success: false, error: "No active class configurations" };
    }

    // Process each class configuration
    const results = [];
    for (const classConfig of activeConfigs) {
      // Get the starting question number from the class config
      const startingQuestion = classConfig.startingQuestion || 1;
      
      const classroomIds = [classConfig.group6Code, classConfig.group4Code].filter(Boolean);
      if (classroomIds.length === 0) continue;
      
      const response = await fetch(`${API_BASE_URL}/api/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "postQuestions",
          data: {
            folderId: classConfig.folderId,
            classroomIds: classroomIds,
            startingQuestion: startingQuestion
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // If the GAS script handles incrementation, we'll trust it did so correctly
        // We should still update our local state to match
        if (result.nextQuestionNumber) {
          // Update the database with the next question number returned by the GAS script
          await User.updateOne(
            { 
              _id: user._id, 
              "settings.classConfigs.grade": classConfig.grade 
            },
            {
              $set: {
                "settings.classConfigs.$.startingQuestion": result.nextQuestionNumber
              }
            }
          );
        }
        
        results.push({
          grade: classConfig.grade,
          success: true
        });
      } else {
        results.push({
          grade: classConfig.grade,
          success: false,
          error: result.error || "Failed to post question"
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results: results
    };
  } catch (error) {
    console.error(`Error posting question for user ${user.email}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Function to post emails for a user
const postEmailsForUser = async (user) => {
  try {
    const sheetsId = user.settings?.globalConfig?.sheetsId;
    if (!sheetsId) {
      console.log(`User ${user.email} has no sheets ID configured. Skipping email posting.`);
      return { success: false, error: "No sheets ID configured" };
    }
    
    // Get all class configs with folder IDs
    const folderIds = {};
    
    if (user.settings?.classConfigs && user.settings.classConfigs.length > 0) {
      user.settings.classConfigs.forEach(config => {
        if (config.grade) {
          folderIds[config.grade] = config.folderId || "";
        }
      });
    }
    
    // Make sure we have at least one valid folder ID
    const hasValidFolder = Object.values(folderIds).some(id => id !== "");
    if (!hasValidFolder) {
      console.log(`User ${user.email} has no valid folder IDs. Skipping email posting.`);
      return { success: false, error: "No valid folder IDs configured" };
    }

    const response = await fetch(`${API_BASE_URL}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "postEmails",
        data: {
          folderIds: folderIds,
          sheetId: sheetsId
        },
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error posting emails for user ${user.email}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Initialize the scheduler
export const initializeScheduler = () => {
  const runScheduler = async () => {
    try {
      const users = await User.find({
        "settings.globalConfig.postingTime": { $exists: true },
      });

      for (const user of users) {
        const postingTime = user.settings?.globalConfig?.postingTime;
        if (postingTime && checkPostingTime(postingTime)) {
          const questionResult = await postQuestionForUser(user);
          if (questionResult.success) {
            console.log(`Successfully posted question for user ${user.email}`);
            // Also post emails after posting questions
            const emailResult = await postEmailsForUser(user);
            if (emailResult.success) {
              console.log(`Successfully posted emails for user ${user.email}`);
            } else {
              console.error(`Failed to post emails for user ${user.email}: ${emailResult.error}`);
            }
          } else {
            console.error(`Failed to post question for user ${user.email}: ${questionResult.error}`);
          }
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  };

  // run every 30 seconds
  setInterval(runScheduler, 30000);
  console.log("Question scheduler initialized (running every 30 seconds)");
};
