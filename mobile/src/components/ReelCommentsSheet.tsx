import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { ReelComment } from "../types/models";
import { CommentsSheet } from "./CommentsSheet";

interface ReelCommentsSheetProps {
  visible: boolean;
  comments: ReelComment[];
  draft: string;
  onChangeDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPosting?: boolean;
  bottomInset?: number;
}

export function ReelCommentsSheet({
  visible,
  comments,
  draft,
  onChangeDraft,
  onClose,
  onSubmit,
  isPosting = false,
}: ReelCommentsSheetProps) {
  const { language, currentUser } = useAppState();
  const copy = getCopy(language);

  return (
    <CommentsSheet
      comments={comments}
      currentUserAvatar={currentUser?.profileImage}
      draft={draft}
      emptyText={copy.beFirstCommentOnReel}
      isPosting={isPosting}
      language={language}
      onChangeDraft={onChangeDraft}
      onClose={onClose}
      onSubmit={onSubmit}
      placeholder={copy.addCommentPlaceholder}
      sendLabel={copy.postComment}
      title={copy.reelCommentsTitle}
      visible={visible}
    />
  );
}
