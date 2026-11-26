import { FileLibraryScreen } from '../../components/FileLibraryScreen';

export default function ExercisesScreen() {
  return (
    <FileLibraryScreen
      category="exercise"
      title="Exercises"
      subtitle="Worksheets, assignments and practice files"
      searchPlaceholder="Search exercises"
      emptyTitle="No exercises yet"
      emptyMessage="Upload a PDF, Word, text or spreadsheet file to get started."
    />
  );
}
