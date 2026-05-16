import Link from "next/link";
import {SiGithub} from "react-icons/si";

export function Footer() {
    return <footer className="border-t border-border/50 mt-16 px-4">
        <div className="max-w-5xl mx-auto py-8">
            <p className="text-xs text-muted-foreground">
                This project is a non-commercial fan implementation and is not affiliated with or endorsed by
                id Software, ZeniMax Media, or the CPMA team.
                <br/><br/>
                Only the officially released Quake III Arena <span
                className="font-semibold">demo data files</span> are used.
                No full retail game assets are hosted or included; all gameplay content is limited
                to files that id Software made publicly available for free.
                <br/><br/>
                The engine is based on <a href="https://github.com/ioquake/ioq3" target="_blank" className="font-semibold text-primary">ioquake3</a>,
                an open-source project licensed under GPLv2. In accordance with the license,
                the source code for the modified ioquake3 WebAssembly build and supporting glue code
                is available upon request. CPMA is used under the terms provided by the CPMA team
                at <a className="font-semibold text-primary" target="_blank" href="https://playmorepromode.com">playmorepromode.com</a>.
                <br/><br/>
                "Quake III Arena" and related trademarks are the property of their respective owners.
            </p>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <p className="font-mono">Built by <a href="https://github.com/lklacar/" target="_blank"><span className="text-red-500">L</span><span
                    className="text-green-500">K</span></a>. Customized by Sul-Matuul.</p>
            </div>
        </div>
    </footer>;
}
