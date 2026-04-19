import { useCallback, useState } from "react";
import SilvaAiAssistantFab from "./SilvaAiAssistantFab";
import SilvaAiChatModal from "./SilvaAiChatModal";

export default function SilvaAiAssistant() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <SilvaAiAssistantFab open={open} onPress={toggle} />
      <SilvaAiChatModal open={open} onClose={close} />
    </>
  );
}
