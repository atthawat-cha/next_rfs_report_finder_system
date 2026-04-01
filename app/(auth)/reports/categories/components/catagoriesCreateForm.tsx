import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CategoryType } from "@/lib/types"
import { useState } from "react"

export default function CatagoriesCreateForm() {

    const [loading, setLoading] = useState(false)
    const [params, setParams] = useState<CategoryType>({
        name: '',
        code: '',
        description: '',
        status: true,
    })

    const handlerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log(params)
    }

    return (
        <form onSubmit={handlerSubmit}>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
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
                        Please enter the category name
                    </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder="Code"
                        value={params?.code}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, code: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        Please enter the category code
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

                <div className="w-full gap-5 my-5">
                    <Label htmlFor="status">Status</Label>
                    <Field orientation="horizontal" className="w-fit mt-2">
                        <Switch id="status" name="status" checked={params?.status} onCheckedChange={(checked) =>
                            setParams({ ...params, status: checked })
                        } />
                        <FieldLabel htmlFor="status">{params?.status ? "Active" : "Inactive"}</FieldLabel>
                    </Field>
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