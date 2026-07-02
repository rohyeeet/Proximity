import { FlowCanvasClient } from "@/components/studio/FlowCanvasClient";

export default async function FlowBuilderPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  return <FlowCanvasClient flowId={flowId} />;
}
