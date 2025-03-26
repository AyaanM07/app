import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    settings: {
      classConfigs: [
        {
          grade: String,
          group6Code: String,
          group4Code: String,
          folderId: String,
          startingQuestion: Number,
          lastPostedForm: String,
        },
      ],
      globalConfig: {
        sheetsId: String,
        postingTime: String,
      },
      p1ToFormsConfig: {
        sourceFolderId: String,
        markschemeFolderId: String,
        targetFolderId: String,
      },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
