// Tofu: a copy's home page leaves out menufic.com's pricing and its contact form (which posted to menufic.com's own
// form service), and shows the sample menu only when NEXT_PUBLIC_SAMPLE_MENU_ID names one (see TOFU.md).
import { type NextPage } from "next";
import { NextSeo } from "next-seo";

import { Footer } from "src/components/Footer";
import { NavHeader } from "src/components/Header";
import { AboutUs, Features, Hero, SampleMenu, Steps } from "src/components/LandingSections";
import { env } from "src/env/client.mjs";

/** Landing page to showcase what menufic is and what are the features that menufic provides */
const LandingPage: NextPage = () => {
    return (
        <>
            <NextSeo
                description="A digital menu generator that lets you to create the best menu for your restaurant. Menufic is packed with several features that will boost the online presence of your restaurant with ease"
                title="Digital menu generator"
            />
            <NavHeader showLoginButton withShadow />
            <Hero />
            <Steps />
            <Features />
            {env.NEXT_PUBLIC_SAMPLE_MENU_ID && <SampleMenu />}
            <AboutUs />
            <Footer />
        </>
    );
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default LandingPage;
