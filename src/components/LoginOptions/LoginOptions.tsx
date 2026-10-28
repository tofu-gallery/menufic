// Tofu: the Google and GitHub buttons are replaced by the owner's password, the one way in to a copy, and the sign-in
// buttons elsewhere open the sign-in page (see TOFU.md).
import type { FC, PropsWithChildren } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Code, PasswordInput, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconLock } from "@tabler/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import type { PopoverBaseProps } from "@mantine/core";

/** What the server knows of the owner's password (src/server/tofu-owner.ts). */
export type OwnerPasswordState = "missing" | "set" | "too_short";

interface LoginOptionsProps {
    /** Whether the owner's password is saved; nobody can sign in until it is */
    passwordState: OwnerPasswordState;
}

export const LoginOptionsContent: FC<LoginOptionsProps> = ({ passwordState }) => {
    const router = useRouter();
    const t = useTranslations("auth");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const callbackUrl = useMemo(() => {
        if (typeof router.query?.callbackUrl === "string" && !router.query?.callbackUrl?.includes("auth/signin")) {
            // if callbackUrl exists and its not the signin url, use it
            return router.query?.callbackUrl;
        }
        return "/restaurant";
    }, [router.query]);

    if (passwordState !== "set") {
        return (
            <Stack maw={420} px="xl" py="md" spacing="sm">
                <Alert
                    color="orange"
                    data-testid="owner-password-missing"
                    icon={<IconAlertCircle />}
                    radius="lg"
                    title={t(passwordState === "missing" ? "ownerPasswordMissingTitle" : "ownerPasswordShortTitle")}
                >
                    <Text>
                        {t(passwordState === "missing" ? "ownerPasswordMissing" : "ownerPasswordShort", {
                            minLength: 12,
                        })}{" "}
                        <Code>MENUFIC_ADMIN_PASSWORD</Code>
                    </Text>
                    <Text mt="xs">{t("ownerPasswordHowTo")}</Text>
                </Alert>
            </Stack>
        );
    }

    const submit = async () => {
        setLoading(true);
        setFailed(false);
        const answer = await signIn("owner-password", { callbackUrl, password, redirect: false });
        if (answer?.ok && answer.url) {
            router.push(answer.url);
            return;
        }
        setLoading(false);
        setFailed(true);
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (password) {
                    submit();
                }
            }}
        >
            <Stack px="xl" py="md" spacing="sm" w={300}>
                {failed && (
                    <Alert color="red" data-testid="owner-password-wrong" icon={<IconAlertCircle />} radius="lg">
                        {t("wrongPassword")}
                    </Alert>
                )}
                <PasswordInput
                    autoComplete="current-password"
                    autoFocus
                    data-testid="owner-password-input"
                    description={t("ownerPasswordDescription")}
                    label={t("ownerPasswordLabel")}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    value={password}
                />
                <Button
                    data-testid="owner-password-submit"
                    leftIcon={<IconLock size={16} />}
                    loading={loading}
                    type="submit"
                >
                    {t("loginButtonLabel")}
                </Button>
            </Stack>
        </form>
    );
};

/** Wraps a sign-in button: it opens the sign-in page, where the owner types their password */
export const LoginOptions: FC<Partial<PopoverBaseProps> & PropsWithChildren> = ({ children }) => (
    <Link data-testid="login-link" href="/auth/signin">
        {children}
    </Link>
);
