import { User } from "../models/user.data.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4545";

// Updated function to check if scheduler should run today
const checkPostingTime = (userPostingTime, skipDates = []) => {
  const now = new Date();

  // Check if current date is in skip dates list
  if (skipDates && skipDates.length > 0) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0); // Reset time part to make comparison easier

    console.log(
      `Checking skip dates for today: ${today.toISOString().split("T")[0]}`,
    );
    console.log(`Skip dates to check: ${JSON.stringify(skipDates)}`);

    // Check if any skip date matches today
    for (const skipDate of skipDates) {
      // Handle both string and Date object cases
      const skipDay = new Date(skipDate);
      skipDay.setHours(0, 0, 0, 0); // Reset time part to make comparison easier

      console.log(
        `Comparing with skip date: ${skipDay.toISOString().split("T")[0]}`,
      );

      // Compare dates as strings in YYYY-MM-DD format for more reliable comparison
      if (
        skipDay.toISOString().split("T")[0] ===
        today.toISOString().split("T")[0]
      ) {
        console.log(`Match found! Skipping today's post.`);
        return false; // Skip this day
      }
    }
  }

  // Continue with regular time check
  const [hours, minutes] = userPostingTime.split(":");
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  const timeMatch =
    utcHours === parseInt(hours) && utcMinutes === parseInt(minutes);
  if (timeMatch) {
    console.log(
      `Time match: ${utcHours}:${utcMinutes} matches scheduled ${hours}:${minutes}`,
    );
  }
  return timeMatch;
};

// Function to post question for a user
const postQuestionForUser = async (user) => {
  try {
    // Get class configs with active classroom codes
    const activeConfigs =
      user.settings?.classConfigs?.filter(
        (config) => (config.group6Code || config.group4Code) && config.folderId,
      ) || [];

    if (activeConfigs.length === 0) {
      console.log(
        `User ${user.email} has no active class configurations. Skipping.`,
      );
      return { success: false, error: "No active class configurations" };
    }

    // Process each class configuration
    const results = [];
    for (const classConfig of activeConfigs) {
      // Get the starting question number from the class config
      const startingQuestion = classConfig.startingQuestion || 1;

      // Add debug logging
      console.log(
        `Posting question for ${classConfig.grade} starting from question #${startingQuestion}`,
      );

      const classroomIds = [
        classConfig.group6Code,
        classConfig.group4Code,
      ].filter(Boolean);
      if (classroomIds.length === 0) continue;

      // Log the payload being sent
      console.log(
        "Sending payload:",
        JSON.stringify({
          action: "postQuestions",
          data: {
            folderId: classConfig.folderId,
            classroomIds: classroomIds,
            startingQuestion: startingQuestion,
          },
        }),
      );

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
            startingQuestion: startingQuestion,
          },
        }),
      });

      const result = await response.json();
      console.log(`Result for ${classConfig.grade}:`, result);

      if (result.success) {
        // Log the form title we're about to save
        console.log(
          `Updating lastPostedForm for ${classConfig.grade} to:`,
          result.title,
        );

        // If the GAS script handles incrementation, we'll trust it did so correctly
        // We should still update our local state to match
        const latestFormTitle = result.title || `Question ${startingQuestion}`;

        // Update both the next question number and the latest form title
        const updateResult = await User.updateOne(
          {
            _id: user._id,
            "settings.classConfigs.grade": classConfig.grade,
          },
          {
            $set: {
              "settings.classConfigs.$.startingQuestion": result.questionNumber,
              "settings.classConfigs.$.lastPostedForm": latestFormTitle,
            },
          },
        );

        // Log the update result
        console.log(
          `Database update result for ${classConfig.grade}:`,
          updateResult,
        );

        results.push({
          grade: classConfig.grade,
          success: true,
          formTitle: result.title,
        });
      } else {
        results.push({
          grade: classConfig.grade,
          success: false,
          error: result.error || "Failed to post question",
        });
      }
    }

    return {
      success: results.some((r) => r.success),
      results: results,
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
      console.log(
        `User ${user.email} has no sheets ID configured. Skipping email posting.`,
      );
      return { success: false, error: "No sheets ID configured" };
    }

    // Get all class configs with folder IDs AND starting question numbers
    const folderIds = {};
    const startingQuestions = {}; // Add this to track starting question numbers

    if (user.settings?.classConfigs && user.settings.classConfigs.length > 0) {
      user.settings.classConfigs.forEach((config) => {
        if (config.grade) {
          folderIds[config.grade] = config.folderId || "";
          startingQuestions[config.grade] = config.startingQuestion || 1; // Store the starting question
        }
      });
    }

    // Make sure we have at least one valid folder ID
    const hasValidFolder = Object.values(folderIds).some((id) => id !== "");
    if (!hasValidFolder) {
      console.log(
        `User ${user.email} has no valid folder IDs. Skipping email posting.`,
      );
      return { success: false, error: "No valid folder IDs configured" };
    }

    // Log what we're sending
    console.log(
      "Email posting payload:",
      JSON.stringify({
        action: "postEmails",
        data: {
          folderIds: folderIds,
          sheetId: sheetsId,
          startingQuestions: startingQuestions, // Include starting questions
        },
      }),
    );

    const response = await fetch(`${API_BASE_URL}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "postEmails",
        data: {
          folderIds: folderIds,
          sheetId: sheetsId,
          startingQuestions: startingQuestions, // Include starting questions in the API call
        },
      }),
    });

    const result = await response.json();

    // If the email posting returns updated question numbers, update them in the database
    if (result.success && result.updatedQuestions) {
      // Update each class's starting question if it was changed
      for (const [grade, newNumber] of Object.entries(
        result.updatedQuestions,
      )) {
        await User.updateOne(
          {
            _id: user._id,
            "settings.classConfigs.grade": grade,
          },
          {
            $set: {
              "settings.classConfigs.$.startingQuestion": newNumber,
            },
          },
        );
      }
    }

    return result;
  } catch (error) {
    console.error(`Error posting emails for user ${user.email}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update the scheduler initialization function
export const initializeScheduler = () => {
  const runScheduler = async () => {
    try {
      const users = await User.find({
        "settings.globalConfig.postingTime": { $exists: true },
      });

      for (const user of users) {
        const postingTime = user.settings?.globalConfig?.postingTime;
        const skipDates = user.settings?.globalConfig?.skipDates || [];

        if (postingTime && checkPostingTime(postingTime, skipDates)) {
          const questionResult = await postQuestionForUser(user);
          if (questionResult.success) {
            console.log(`Successfully posted question for user ${user.email}`);

            // Also post emails after posting questions
            const emailResult = await postEmailsForUser(user);
            if (emailResult.success) {
              console.log(`Successfully posted emails for user ${user.email}`);
            } else {
              console.log(
                `Failed to post emails for user ${user.email}: ${emailResult.error}`,
              );
            }
          } else {
            console.error(
              `Failed to post question for user ${user.email}: ${questionResult.error}`,
            );
          }
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  };

  // run every 31 seconds
  // lazy fix since sometimes it'll run twice in a minute
  setInterval(runScheduler, 31000);
  console.log("Question scheduler initialized (running every 31 seconds)");
};
