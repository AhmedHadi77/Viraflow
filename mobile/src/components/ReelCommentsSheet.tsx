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
  /** The creator turned comments off (and the viewer isn't the creator). */
  commentsOff?: boolean;
}

export function ReelCommentsSheet({
  visible,
  comments,
  draft,
  onChangeDraft,
  onClose,
  onSubmit,
  isPosting = false,
  commentsOff = false,
}: ReelCommentsSheetProps) {
  const { language, currentUser } = useAppState();
  const copy = getCopy(language);

  return (
    <CommentsSheet
      closedMessage={commentsOff ? copy.commentsOffNotice : undefined}
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
