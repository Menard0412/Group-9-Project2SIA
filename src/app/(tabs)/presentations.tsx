import { FileLibraryScreen } from '../../components/FileLibraryScreen';

export default function PresentationsScreen() {
  return (
    <FileLibraryScreen
      category="presentation"
      title="Presentations"
      subtitle="Slide decks and lecture materials (.ppt, .pptx, .pdf)"
      searchPlaceholder="Search presentations"
      emptyTitle="No presentations yet"
      emptyMessage="Upload your first slide deck to keep it handy on this device."
    />
  );
}
