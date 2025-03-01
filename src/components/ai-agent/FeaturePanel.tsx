
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotV1Panel } from "./panels/ProductShotV1Panel";
import { ProductShotV2Panel } from "./panels/ProductShotV2Panel";
import { ImageToVideoPanel } from "./panels/ImageToVideoPanel";
import { FacelessVideoPanel } from "./panels/FacelessVideoPanel";
import { ProductShotV1Props, ProductShotV2Props, ImageToVideoProps } from "./types";
import { Message } from "@/types/message";

interface FeaturePanelProps {
  messages: Message[];
  productShotV2: ProductShotV2Props;
  productShotV1: ProductShotV1Props;
  imageToVideo: ImageToVideoProps;
  activeTool: string;
}

export function FeaturePanel({ messages, productShotV2, productShotV1, imageToVideo, activeTool }: FeaturePanelProps) {
  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs value={activeTool} className="h-[calc(100vh-8rem)]">
        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ProductShotV1Panel 
            productShotV1={productShotV1} 
            messages={messages} 
          />
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ProductShotV2Panel 
            productShotV2={productShotV2} 
            messages={messages} 
          />
        </TabsContent>

        <TabsContent value="image-to-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ImageToVideoPanel 
            imageToVideo={imageToVideo} 
            messages={messages} 
          />
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <FacelessVideoPanel 
            productShotV1={productShotV1}
            messages={messages} 
          />
        </TabsContent>

        <TabsContent value="script-builder" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
