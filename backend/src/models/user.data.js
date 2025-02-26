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
        },
      ],
      globalConfig: {
        sheetsId: String,
        postingTime: String,
        startingQuestion: Number,
      },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
