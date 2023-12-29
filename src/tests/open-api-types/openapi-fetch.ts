import createClient from "openapi-fetch";
import type { paths } from "./v3";

const client = createClient<paths>({ baseUrl: "https://catfact.ninja/" });

client.GET("/admin/hooks",{
    params:{
        query:{
            page:1,
            per_page:10
        }   
    }
});

client.POST("/scim/v2/enterprises/{enterprise}/Groups", {
    params: {
        path: {
            enterprise: "a"
        }
    },
    body: {
        displayName: "",
        schemas: []
    }
})