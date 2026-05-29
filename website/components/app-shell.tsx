import {Sidebar} from "@/components/sidebar";
import {SiteDecorator} from "@/components/site-decorator";
import {Footer} from "@/components/footer";
import React from "react";

export function AppShell(props: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar/>
            <div className="flex flex-1 flex-col min-w-0 pt-14 md:pt-0">
                <SiteDecorator/>
                <main className="flex-1">
                    {props.children}
                </main>
                <Footer/>
            </div>
        </div>
    );
}
