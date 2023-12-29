


export interface ServiceTagObject {
    name: string;
    serviceName: string;
    description?: string;
}

export interface ServiceFactoryConfig {
    url: string;
    targetFolder: string;
    clearTargetFolder?: boolean;
    tags: ServiceTagObject[];
    unclassifiedTag?: {
        serviceName: string;
    },
    unNameTagToOtherService?: boolean;
}