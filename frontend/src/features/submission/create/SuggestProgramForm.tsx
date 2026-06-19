type SuggestProgramFormProps = {
  submitLabel?: string;
};

export function SuggestProgramForm({
  submitLabel = "Send program for review"
}: SuggestProgramFormProps) {
  return (
    <form className="placeholder-form">
      <h2>Program form</h2>
      <label className="auth-form-fields__label">
        <span>Title</span>
        <input className="text-input" name="title" type="text" />
      </label>
      <label className="auth-form-fields__label">
        <span>Country</span>
        <input className="text-input" name="country" type="text" />
      </label>
      <label className="auth-form-fields__label">
        <span>Type</span>
        <input className="text-input" name="type" type="text" />
      </label>
      <label className="auth-form-fields__label">
        <span>Deadline</span>
        <input className="text-input" name="deadline" type="date" />
      </label>
      <label className="auth-form-fields__label">
        <span>Source URL</span>
        <input className="text-input" name="url" type="url" />
      </label>
      <label className="auth-form-fields__label">
        <span>Description</span>
        <textarea className="text-input text-input--textarea" name="description" />
      </label>
      <button className="primary-button" type="submit">{submitLabel}</button>
    </form>
  );
}
