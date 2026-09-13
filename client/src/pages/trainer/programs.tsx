import { ProgramListSection } from "@/components/program-list-section";

export default function TrainerProgramsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-trainer-programs-title">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Build multi-day courses for your players. Players can enroll
          and complete day-by-day at their own pace.
        </p>
      </div>
      <ProgramListSection mode="trainer" />
    </div>
  );
}
