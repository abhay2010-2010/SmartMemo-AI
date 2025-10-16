"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"

interface EditTranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  initialText: string
  onSave: (text: string) => void
}

const EditTranscriptModal: React.FC<EditTranscriptModalProps> = ({
  isOpen,
  onClose,
  initialText,
  onSave,
}) => {
  const [editedText, setEditedText] = useState(initialText)

  useEffect(() => {
    setEditedText(initialText)
  }, [initialText])

  const handleSave = () => {
    onSave(editedText)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Transcription</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-full min-h-[300px] p-4 text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTranscriptModal