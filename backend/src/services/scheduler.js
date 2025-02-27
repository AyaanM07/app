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
    const startingQuestion = user.settings?.globalConfig?.startingQuestion || 1;

    const response = await fetch(`${API_BASE_URL}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "postQuestions",
        data: {
          folderId: user.settings?.classConfigs?.[0]?.folderId,
          classroomIds:
            user.settings?.classConfigs?.flatMap((config) =>
              [config.group6Code, config.group4Code].filter(Boolean),
            ) || [],
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to post question");
    }

    // Only update if posting was successful
    await User.findByIdAndUpdate(user._id, {
      "settings.globalConfig.startingQuestion": startingQuestion + 1,
    });

    return result;
  } catch (error) {
    console.error(`Error posting question for user ${user.email}:`, error);
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
          const result = await postQuestionForUser(user);
          if (result.success) {
            console.log(`Successfully posted question for user ${user.email}`);
          } else {
            console.error(
              `Failed to post question for user ${user.email}: ${result.error}`,
            );
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
