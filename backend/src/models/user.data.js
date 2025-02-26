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
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date, // can later add classrooms ids specific to user when integrating with automated posting for google classroom
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
