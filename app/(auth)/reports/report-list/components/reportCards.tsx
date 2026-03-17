import { ReportGetDataType } from "@/lib/types";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    // CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import Image from "next/image";

import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemHeader,
    ItemTitle,
} from "@/components/ui/item"



const models = [
    {
        name: "v0-1.5-sm",
        description: "Everyday tasks and UI generation.",
        image:
            "https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop",
        credit: "Valeria Reverdo on Unsplash",
    },
    {
        name: "v0-1.5-lg",
        description: "Advanced thinking or reasoning.",
        image:
            "https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop",
        credit: "Michael Oeser on Unsplash",
    },
    {
        name: "v0-2.0-mini",
        description: "Open Source model for everyone.",
        image:
            "https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop",
        credit: "Cherry Laithang on Unsplash",
    },
    {
        name: "v0-2.0-mini",
        description: "Open Source model for everyone.",
        image:
            "https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop",
        credit: "Cherry Laithang on Unsplash",
    },
    {
        name: "v0-2.0-mini",
        description: "Open Source model for everyone.",
        image:
            "https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop",
        credit: "Cherry Laithang on Unsplash",
    },
    {
        name: "v0-2.0-mini",
        description: "Open Source model for everyone.",
        image:
            "https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop",
        credit: "Cherry Laithang on Unsplash",
    },
]

export default function ReportCardView({ reports }: { reports: ReportGetDataType[] }) {
    return (
        <div className="flex w-full  flex-col gap-5">
            <ItemGroup className="grid grid-cols-4 gap-4">
                {models.map((model) => (
                    <Item key={model.name} variant="outline">
                        <ItemHeader>
                            <Image
                                src={model.image}
                                alt={model.name}
                                width={128}
                                height={128}
                                className="aspect-square w-full rounded-sm object-cover"
                            />
                        </ItemHeader>
                        <ItemContent>
                            <ItemTitle>{model.name}</ItemTitle>
                            <ItemDescription>{model.description}</ItemDescription>
                        </ItemContent>
                    </Item>
                ))}
            </ItemGroup>
        </div>

        // <Card className="relative mx-auto w-full max-w-sm pt-0">
        //     <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
        //     <Image src={'/assest/images/cheesecake.jpg'} alt="test" style={imageStyle} fill loading="lazy" />
        //     <CardHeader>
        //         <CardTitle>Small Card</CardTitle>
        //         <CardDescription>
        //             This card uses the small size variant.
        //         </CardDescription>
        //     </CardHeader>
        //     <CardContent>
        //         <p>
        //             The card component supports a size prop that can be set to
        //             &quot;sm&quot; for a more compact appearance.
        //         </p>
        //     </CardContent>
        //     <CardFooter>
        //         <Button variant="outline" size="sm" className="w-full">
        //             Action
        //         </Button>
        //     </CardFooter>
        // </Card>
    )
}