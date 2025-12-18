import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Caption Variant Type
 */
export enum CaptionType {
  HOOK = 'hook',
  VALUE = 'value',
  EMOTION = 'emotion',
}

/**
 * Caption Interface
 */
export interface ICaption {
  type: CaptionType;
  text: string;
}

/**
 * Key Moment Interface
 */
export interface IKeyMoment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  summary: string;
  suggestedHook: string;
  viralScore: number; // 1-10
  captions: ICaption[];
}

/**
 * Analysis Interface
 */
export interface IAnalysis extends Document {
  videoId: Types.ObjectId;
  userId: Types.ObjectId;
  keyMoments: IKeyMoment[];
  overallSummary?: string;
  totalDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Caption Schema
 */
const CaptionSchema = new Schema<ICaption>(
  {
    type: {
      type: String,
      enum: Object.values(CaptionType),
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: [150, 'Caption cannot exceed 150 characters'],
    },
  },
  { _id: false } // Don't create _id for subdocuments
);

/**
 * Key Moment Schema
 */
const KeyMomentSchema = new Schema<IKeyMoment>(
  {
    startTime: {
      type: Number,
      required: true,
      min: 0,
    },
    endTime: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: IKeyMoment, value: number) {
          return value > this.startTime;
        },
        message: 'End time must be greater than start time',
      },
    },
    summary: {
      type: String,
      required: true,
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },
    suggestedHook: {
      type: String,
      required: true,
      maxlength: [200, 'Hook cannot exceed 200 characters'],
    },
    viralScore: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    captions: {
      type: [CaptionSchema],
      required: true,
      validate: {
        validator: function (captions: ICaption[]) {
          return captions.length === 3;
        },
        message: 'Must have exactly 3 caption variants',
      },
    },
  },
  { _id: true } // Create _id for each key moment
);

/**
 * Analysis Schema
 */
const AnalysisSchema = new Schema<IAnalysis>(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      unique: true, // One analysis per video
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keyMoments: {
      type: [KeyMomentSchema],
      required: true,
      validate: {
        validator: function (moments: IKeyMoment[]) {
          return moments.length >= 3 && moments.length <= 5;
        },
        message: 'Must have between 3 and 5 key moments',
      },
    },
    overallSummary: {
      type: String,
      maxlength: [1000, 'Overall summary cannot exceed 1000 characters'],
    },
    totalDuration: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for better query performance
 */
AnalysisSchema.index({ userId: 1, createdAt: -1 });

/**
 * Virtual to get duration of each key moment
 */
KeyMomentSchema.virtual('duration').get(function () {
  return this.endTime - this.startTime;
});

/**
 * Method to get top key moments by viral score
 */
AnalysisSchema.methods.getTopMoments = function (limit: number = 3) {
  return this.keyMoments
    .sort((a: IKeyMoment, b: IKeyMoment) => b.viralScore - a.viralScore)
    .slice(0, limit);
};

const Analysis = mongoose.model<IAnalysis>('Analysis', AnalysisSchema);

export default Analysis;