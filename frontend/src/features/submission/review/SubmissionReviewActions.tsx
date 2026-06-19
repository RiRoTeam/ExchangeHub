export function SubmissionReviewActions() {
  return (
    <div className="action-strip">
      <button className="primary-button" type="button">Publish</button>
      <button className="secondary-button" type="button">Edit</button>
      <button className="secondary-button secondary-button--danger" type="button">Decline</button>
    </div>
  );
}
