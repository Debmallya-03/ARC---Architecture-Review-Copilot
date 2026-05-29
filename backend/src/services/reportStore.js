import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    title: String,
    source: String,
    mode: String,
    note: String,
    overview: String,
    techStack: Object,
    sections: Object,
    issues: Object,
    recommendations: [String],
    score: Number,
    diagrams: Object
  },
  { timestamps: true, strict: false }
);

let ReportModel;

export async function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  await mongoose.connect(process.env.MONGODB_URI);
  ReportModel = mongoose.models.Report || mongoose.model('Report', reportSchema);
  console.log('MongoDB connected for report storage');
}

export async function saveReport(report) {
  if (!ReportModel) return null;
  const saved = await ReportModel.create(report);
  return { ...saved.toObject(), id: saved._id.toString() };
}

export async function getReport(id) {
  if (!ReportModel) return null;
  const report = await ReportModel.findById(id).lean();
  return report ? { ...report, id: report._id.toString() } : null;
}
