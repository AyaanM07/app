import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    folderId: {
      type: String,
      required: true,
      index: true,
    },
    forms: [
      {
        id: String,
        name: String,
        url: String,
        lastUpdated: Date,
      },
    ],
    lastFetched: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

formSchema.index({ folderId: 1, lastFetched: 1 });

export const Form = mongoose.model("Form", formSchema);
