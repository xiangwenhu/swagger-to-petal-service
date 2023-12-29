import fs from "fs";
import { OpenAPIV2 } from "openapi-types";
import path from "path";
import { BUILTIN_FOLDER } from "../../const";
import { ServiceFactoryConfig } from "../../types";
import { copyFolder } from "../../util/fs";
import { format } from "../../util/prettier";
import * as lUtils from "./util";
import _ from "lodash";



const DEFAULT_CONFIG: Partial<ServiceFactoryConfig> = {
    clearTargetFolder: false, // 是否清空目标文件夹
    unclassifiedTag: {
        serviceName: "other",
    },
    unNameTagToOtherService: false
}

export default class ServiceFactoryV2 {

    private oriDoc: OpenAPIV2.Document;
    private doc!: OpenAPIV2.Document;

    constructor(doc: OpenAPIV2.Document, private config: ServiceFactoryConfig) {
        this.oriDoc = doc;
        // this.doc = _.cloneDeep(doc);
        this.config = _.merge(DEFAULT_CONFIG, config)
    }

    private getBuiltInHeader() {
        return `
        import instance from "./builtin/baseService";
        import { replacePathParams } from "./builtin/util";
        `;
    }

    async generate() {
        this.doc = _.cloneDeep(this.oriDoc);
        const { config, doc } = this;
        // 转为列表
        const apis = lUtils.toList(doc);
        // 按照tag分组
        const tagGroups = lUtils.groupTagApis({
            tags: doc.tags || [],
            sTags:  config.tags,
            unNameTagToOtherService: config.unNameTagToOtherService || false,
            otherTagServiceName: config.unclassifiedTag?.serviceName || 'other',
        }, apis);
        // 生成Types
        const typesContent = await lUtils.generateTypes(apis, doc);
        // 美化
        const formattedTypesContent = await format(typesContent)
        // 保存
        fs.writeFileSync(
            path.join(config.targetFolder, "service.types.ts"),
            formattedTypesContent
        );

        // 生成服务部分
        const buildInHeader = this.getBuiltInHeader();
        for (let i = 0; i < tagGroups.length; i++) {
            const group = tagGroups[i];
            const tag = group.tag;
            const serviceTypes = await lUtils.generateAPIService(group.apis);
            const formattedContent = await format(buildInHeader + "\r\n" + serviceTypes)

            fs.writeFileSync(
                // @ts-ignore
                path.join(config.targetFolder, `${tag.serviceName}.ts`),
                formattedContent
            );
        }
        // 拷贝内置的代码
        await copyFolder(BUILTIN_FOLDER, path.join(config.targetFolder, "builtin"));
    }
}

