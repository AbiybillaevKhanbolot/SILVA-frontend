import "../styles/silva-ai-assistant-fab.css";

export default function SilvaAiAssistantFab({ open = false, onPress }) {
  return (
    <button
      type="button"
      className="silva-ai-fab"
      aria-label="Помощник Silva"
      title="Помощник Silva"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onPress}
    >
      <span className="silva-ai-orb" aria-hidden>
        <span className="silva-ai-orb__stage">
          <span className="silva-ai-orb__disc silva-ai-orb__disc--d4" />
          <span className="silva-ai-orb__disc silva-ai-orb__disc--d1" />
          <span className="silva-ai-orb__disc silva-ai-orb__disc--d2" />
          <span className="silva-ai-orb__disc silva-ai-orb__disc--d3" />
          <span className="silva-ai-orb__rings" />
        </span>
        <span className="silva-ai-orb__glass" />
      </span>
    </button>
  );
}
