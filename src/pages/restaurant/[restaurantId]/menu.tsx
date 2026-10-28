import { Container } from "@mantine/core";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";
import superjson from "superjson";

import type { GetStaticPropsContext, NextPage } from "next";

import { Empty } from "src/components/Empty";
import { Footer } from "src/components/Footer";
import { RestaurantMenu } from "src/components/RestaurantMenu";
import { env } from "src/env/client.mjs";
import { appRouter } from "src/server/api/root";
import { createInnerTRPCContext } from "src/server/api/trpc";
import { api } from "src/utils/api";

/** Restaurant menu page that will be shared publicly */
const RestaurantMenuPage: NextPage = () => {
    const router = useRouter();
    const { status } = useSession();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("menu");

    const { data: restaurant } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: status === "authenticated" && !!restaurantId }
    );

    return (
        <>
            <NextSeo
                // Tofu: the link preview describes the restaurant alone; upstream ended it with "This menu was generated
                // using Menufic.com", upstream's own hosted service, which a copy has nothing to do with (see TOFU.md).
                description={`${t("seoDescription.restaurantName", { name: restaurant?.name })}. ${t(
                    "seoDescription.restaurantLocation",
                    { location: restaurant?.location }
                )}${
                    restaurant?.contactNo
                        ? t("seoDescription.restaurantContactNo", { contactNo: restaurant?.contactNo })
                        : ""
                }`}
                openGraph={{
                    // Tofu: the photo is served by the app itself, at this copy's own address (see TOFU.md).
                    images: restaurant?.image?.path
                        ? [{ url: `${env.NEXT_PUBLIC_PROD_URL}${restaurant.image.path}` }]
                        : undefined,
                    type: "restaurant.menu",
                }}
                themeColor={restaurant?.image?.color}
                title={t("seoTitle", { name: restaurant?.name })}
            />
            <main>
                <Container py="lg" size="xl">
                    {restaurant && restaurant?.isPublished === true ? (
                        <RestaurantMenu restaurant={restaurant} />
                    ) : (
                        <Empty height="calc(100vh - 100px)" text={t("noDetailsAvailable")} />
                    )}
                </Container>
            </main>
            <Footer />
        </>
    );
};

export async function getStaticProps(context: GetStaticPropsContext<{ restaurantId: string }>) {
    const ssg = createProxySSGHelpers({
        ctx: createInnerTRPCContext({ session: null }),
        router: appRouter,
        transformer: superjson,
    });
    const restaurantId = context.params?.restaurantId as string;
    const messages = (await import("src/lang/en.json")).default;
    // Tofu: a published menu is read again at most a minute after it was last drawn (it was 30 minutes), so a change the
    // owner makes reaches the guests' phones within about a minute; a restaurant that is not published reads as not
    // found here, so its page is the same "no details" page as an unknown one (see TOFU.md).
    try {
        const restaurant = await ssg.restaurant.getDetails.fetch({ id: restaurantId });
        if (restaurant.isPublished) {
            // Only return restaurants that are published
            return { props: { messages, restaurantId, trpcState: ssg.dehydrate() }, revalidate: 60 };
        }
        return { props: { messages, restaurantId }, revalidate: 60 };
    } catch {
        return { props: { messages, restaurantId }, revalidate: 60 };
    }
}

export const getStaticPaths = async () => ({ fallback: "blocking", paths: [] });

export default RestaurantMenuPage;
