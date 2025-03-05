
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomOrderLinks } from "./CustomOrderLinks";

export const CustomLinkButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Custom Order Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Order Links</DialogTitle>
          <DialogDescription>
            Create and manage shareable custom order links with custom rates.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CustomOrderLinks />
        </div>
      </DialogContent>
    </Dialog>
  );
};
