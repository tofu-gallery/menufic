// Tofu: the page asks for the owner's password, or says plainly that the owner has not saved one yet (see TOFU.md).
import { BackgroundImage, Box, Center, createStyles } from "@mantine/core";
import { unstable_getServerSession } from "next-auth/next";

import type { GetServerSidePropsContext, NextPage } from "next";
import type { OwnerPasswordState } from "src/components/LoginOptions/LoginOptions";

import { LoginOptionsContent } from "src/components/LoginOptions";
import { Logo } from "src/components/Logo";
import { ownerPasswordState } from "src/server/tofu-owner";

import { authOptions } from "../api/auth/[...nextauth]";

const useStyles = createStyles((theme) => {
    return {
        background: { minHeight: "100vh", padding: 16 },
        contentWrap: {
            alignItems: "center",
            background: theme.colors.dark[0],
            borderRadius: theme.radius.md,
            boxShadow: theme.shadows.lg,
            display: "flex",
            flexDirection: "column",
            maxWidth: "100%",
            padding: `${theme.spacing.md}px ${theme.spacing.xs}px`,
        },
    };
});

/** Replace standard next-auth login page with custom login page */
const SignIn: NextPage<{ passwordState: OwnerPasswordState }> = ({ passwordState }) => {
    const { classes } = useStyles();
    return (
        <BackgroundImage className={classes.background} src="/landing-hero-bg.svg">
            <Center mih="calc(100vh - 32px)">
                <Box className={classes.contentWrap}>
                    <Box my={10}>
                        <Logo />
                    </Box>
                    <LoginOptionsContent passwordState={passwordState} />
                </Box>
            </Center>
        </BackgroundImage>
    );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await unstable_getServerSession(context.req, context.res, authOptions);
    // If the user is already logged in, redirect.
    if (session) {
        const callbackUrl =
            context.query?.callbackUrl && !context.query?.callbackUrl?.includes("auth/signin")
                ? context.query?.callbackUrl
                : "/restaurant";
        return { redirect: { destination: callbackUrl } };
    }
    return {
        props: { messages: (await import("src/lang/en.json")).default, passwordState: ownerPasswordState() },
    };
}

export default SignIn;
