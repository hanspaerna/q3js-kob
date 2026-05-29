import Image from "next/image";

export function SiteDecorator() {
    return (
        <div className="border-b-2 border-primary/60">
            <div className="flex items-center justify-center gap-4 px-4 py-6">
                <Image
                    src="/skeletonlair.png"
                    alt=""
                    width={180}
                    height={180}
                    className="hidden lg:block -scale-x-100 shrink-0 drop-shadow-[0_0_12px_rgba(180,0,0,0.5)]"
                />
                <Image
                    src="/skeletonlair.png"
                    alt=""
                    width={80}
                    height={80}
                    className="lg:hidden -scale-x-100 shrink-0"
                />

                <div className="flex-1 flex justify-center">
                    <div className="w-fit">
                        <i className="font-serif text-foreground/75 leading-relaxed">
                            <p className="text-left text-sm md:text-base">
                                Лижи макет шершавой плоти,<br/>
                                Вервольф с звезды Ольдеборан,<br/>
                                Ты, может, выжил при Пол Поте,<br/>
                                Но мой сильнее раилган.
                            </p>
                            <p className="text-right mt-3 text-sm md:text-base">
                                В. П. Пидоренко
                            </p>
                        </i>
                    </div>
                </div>

                <Image
                    src="/skeletonlair.png"
                    alt=""
                    width={180}
                    height={180}
                    className="hidden lg:block shrink-0 drop-shadow-[0_0_12px_rgba(180,0,0,0.5)]"
                />
                <Image
                    src="/skeletonlair.png"
                    alt=""
                    width={80}
                    height={80}
                    className="lg:hidden shrink-0"
                />
            </div>
        </div>
    );
}
