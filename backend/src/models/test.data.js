import mongoose from "mongoose";

const subQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'a', 'b', 'i', 'ii'
  content: { type: String },
  isSelected: { type: Boolean, default: true },
  pageNumber: { type: Number },
  marks: { type: Number, default: 0 }
});

const questionSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  content: { type: String },
  isSelected: { type: Boolean, default: true },
  pageNumber: { type: Number },
  subQuestions: [subQuestionSchema]
});

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: String,
      default: "General"
    },
    description: {
      type: String,
      default: ""
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number, // in minutes
      default: 60
    },
    pdfUrl: {
      type: String
    },
    questions: [questionSchema],
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Test = mongoose.model("Test", testSchema);