import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TagsType } from "@/lib/types"
import { useState } from "react"

export default function TagsCreateForm() {

    const [loading, setLoading] = useState(false)
    const [params, setParams] = useState<TagsType>({
        name: '',
        slug: '',
        description: '',
    })

    const handlerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log(params)
    }

    return (
        <form onSubmit={handlerSubmit}>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto p-5">
                <div className="w-full space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Name"
                        value={params?.name}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, name: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        Please enter the tag name
                    </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                        id="slug"
                        type="text"
                        placeholder="Slug"
                        value={params?.slug}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, slug: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        Please enter the tag slug
                    </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Description"
                        rows={3}
                        value={params?.description}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, description: e.target.value })
                        }
                        disabled={loading}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{loading ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
        </form>
    )
}