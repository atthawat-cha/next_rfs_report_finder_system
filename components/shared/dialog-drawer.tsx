"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSize } from "ahooks"
import { cn } from "@/lib/utils"
// import { useMediaQuery } from "@/hooks/use-media-query"

type Props = {
  children: React.ReactNode;
  isOpen?: boolean;
  setisOpen?: React.Dispatch<React.SetStateAction<boolean>>
  handlerSubmit?: () => void
  title?: string;
  description?: string;
  btnText?: string;
}



export function DrawerDialogDemo({ children, title, isOpen, handlerSubmit, description, btnText }: Props) {
  // const [open, setOpen] = React.useState(false)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{btnText}</Button>
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
