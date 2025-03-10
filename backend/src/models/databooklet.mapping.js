import mongoose from "mongoose";

const dataBookletMappingSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true
  },
  mappings: [{
    version: {
      type: String,
      required: true
    },
    sectionNumber: {
      type: String,
      required: true
    },
    content: {
      type: String,
      default: ""
    }
  }],
  latestVersion: {
    type: String,
    required: true
  }
});

export const DataBookletMapping = mongoose.model("DataBookletMapping", dataBookletMappingSchema);