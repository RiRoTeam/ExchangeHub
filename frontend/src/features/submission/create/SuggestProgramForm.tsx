type SuggestProgramFormProps = {
  submitLabel?: string;
};

export function SuggestProgramForm({
  submitLabel = "Send program for review"
}: SuggestProgramFormProps) {
  return (
    <form>
      <h2>Program form</h2>
      <label>
        <span>Title</span>
        <input name="title" type="text" />
      </label>
      <label>
        <span>Country</span>
        <input name="country" type="text" />
      </label>
      <label>
        <span>Type</span>
        <input name="type" type="text" />
      </label>
      <label>
        <span>Deadline</span>
        <input name="deadline" type="date" />
      </label>
      <label>
        <span>Source URL</span>
        <input name="url" type="url" />
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
