"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
  children: React.ReactNode;
  // Still part of the props contract (all 3 call sites pass it) even though
  // this component's uncontrolled <Dialog> below doesn't read it - see
  // document/00-progress.md's Phase 5d/6a notes on this being a known,
  // out-of-scope-for-now bug (this demo scaffold ignores isOpen entirely).
  isOpen?: boolean;
  setisOpen?: React.Dispatch<React.SetStateAction<boolean>>
  title?: string;
  description?: string;
  btnText?: string;
}



export function DrawerDialogDemo({ children, title, description, btnText }: Props) {
  // const [open, setOpen] = React.useState(false)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">{btnText}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {/* Content */}
        {children}
      </DialogContent>

    </Dialog>
  )
}
