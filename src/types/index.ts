

export interface ServiceFactoryConfig {
    url: string;
    targetFolder: string;
    clearTargetFolder?: boolean;
    tags: {
        name: string;
        serviceName: string;
        description?: string;
    }[];
    unclassifiedTag?: {
        serviceName: string;
    }
}