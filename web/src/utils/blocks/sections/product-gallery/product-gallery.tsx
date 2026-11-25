import { AspectRatio } from "@/components/ui/aspect-ratio"
import type { BlockProps } from "@/utils/blocks/types"
import { InlineImage, InlineText, type InlineEditor } from "@/utils/blocks/shared/inline-editing"
import { safeImageUrl } from "@/utils/blocks/shared/urls"

export function ProductGalleryBlock({props:p,editor}:{props:BlockProps;editor?:InlineEditor}) {
 return <section className="builder-block builder-block--spacious bg-background"><div className="container mx-auto">{p.title&&<h2 className="mb-6 text-2xl font-semibold"><InlineText editor={editor} target={{kind:"property",key:"title"}} value={p.title} label="título" /></h2>}<div className="grid gap-4 @md:grid-cols-3">{(p.items??[]).map((item,i)=><InlineImage key={item.id} editor={editor} url={item.href} alt={item.title} target={{kind:"item",id:item.id,key:"href"}} altTarget={{kind:"item",id:item.id,key:"title"}} className={i===0?"@md:col-span-3":""}><AspectRatio ratio={i===0?1.5:1} className="overflow-hidden rounded-xl bg-muted"><img src={safeImageUrl(item.href)} alt={item.title} className="size-full object-cover" /></AspectRatio></InlineImage>)}</div></div></section>
}
