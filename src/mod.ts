/* eslint-disable @typescript-eslint/naming-convention */

import { DependencyContainer } from "tsyringe";
import { InstanceManager } from "./InstanceManager";

import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor";
import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { IQuest } from "@spt-aki/models/eft/common/tables/IQuest";


class DExpandedTaskText implements IPostDBLoadMod, IPreAkiLoadMod
{
    private Instance: InstanceManager = new InstanceManager();
    private Config = require("../config/config.json");
    private modName = "ExpandedTaskText";
    private mod;
    
    private dbEN: JSON = require("../db/TasklocaleEN.json");

    private tasks: Record<string, IQuest>;
    private locale: Record<string, Record<string, string>>;

    public preAkiLoad(container: DependencyContainer): void
    {
        this.Instance.preAkiLoad(container, this.modName);
        
        

        this.mod = require("../package.json");
    }

    public postDBLoad(container: DependencyContainer): void 
    {
        this.Instance.postDBLoad(container);

        this.Instance.logger.log("Expanded Task Text is loading please wait...", LogTextColor.GREEN);

        this.getAllTasks(this.Instance.database);
        this.updateAllTasksText(this.Instance.database);

        this.Instance.logger.log("Expanded Task Text loading complete", LogTextColor.GREEN);
    }

    private getAllTasks(database: IDatabaseTables): void
    {
        this.tasks = database.templates.quests;
        this.locale = database.locales.global;
    }

    private getAllNextQuestsInChain(currentQuestId: string): string | undefined
    {
        const nextQuests: string[] = [];
    
        Object.keys(this.tasks).forEach(key => 
        {
            if (this.tasks[key].conditions.AvailableForStart === undefined)
            {
                return undefined;
            }

            const conditionsAOS = this.tasks[key].conditions.AvailableForStart;
    
            for (const condition in conditionsAOS) 
            {
                if (conditionsAOS[condition]?.conditionType === "Quest" &&
                    conditionsAOS[condition]?.target === currentQuestId) 
                {
                    const nextQuestName = this.locale["en"][`${key} name`];
                    nextQuests.push(nextQuestName);
    
                    // Recursively find the next quests for the current quest
                    const recursiveResults = this.getAllNextQuestsInChain(nextQuestName);
                    nextQuests.push(...recursiveResults);
                }
            }
        });
        const resultString = nextQuests.join(', ');
        return resultString;
    }
    
    

    private updateAllTasksText(database: IDatabaseTables)
    {
        Object.keys(this.tasks).forEach(key =>
        {

            for (const localeID in this.locale)
            {
                const originalDesc = this.locale[localeID][`${key} description`];
                let keyDesc;
                let collector;
                let lightKeeper;
                let durability;
                let requiredParts;
                let timeUntilNext;
                let leadsTo;

                if (this.dbEN[key]?.IsKeyRequired == true && this.tasks[key]?._id == key)
                {
                    if (this.dbEN[key]?.OptionalKey == "")
                    {
                        keyDesc = `Required key(s): ${this.dbEN[key].RequiredKey} \n \n`;
                    }
                    else if (this.dbEN[key]?.RequiredKey == "")
                    {
                        keyDesc = `Optional key(s): ${this.dbEN[key].OptionalKey} \n \n`;
                    }
                    else
                    {
                        keyDesc = `Required Key(s):  ${this.dbEN[key].RequiredKey} \n Optional Key(s): ${this.dbEN[key].OptionalKey} \n \n`
                    }
                }
                    
                if (this.dbEN[key]?.RequiredCollector)
                {
                    collector = "This quest is required for collector \n \n";
                }

                if (this.dbEN[key]?.RequiredLightkeeper)
                {
                    lightKeeper = "This quest is required for Lightkeeper \n \n";
                }

                if (this.getAllNextQuestsInChain(key) !== undefined || this.getAllNextQuestsInChain(key) !== "")
                {
                    leadsTo = `Leads to: ${this.getAllNextQuestsInChain(key)} \n \n`;
                }

                if (this.dbEN[key]?.RequiredParts && this.dbEN[key]?.RequiredDurability)
                {
                    durability = `Required Durability: ${this.dbEN[key].RequiredDurability} \n`;
                    requiredParts = `Required Parts: \n ${this.dbEN[key].RequiredParts} \n \n`;
                }

                if (this.dbEN[key]?.TimeUntilNext)
                {
                    timeUntilNext = `Time until next task unlocks: ${this.dbEN[key].TimeUntilNext} \n \n`;
                }

                if (keyDesc == undefined)
                {
                    keyDesc = "";
                }

                if (collector == undefined)
                {
                    collector = "";
                }

                if (lightKeeper == undefined)
                {
                    lightKeeper = "";
                }

                if (requiredParts == undefined)
                {
                    requiredParts = "";
                }

                if (durability == undefined)
                {
                    durability = "";
                }

                if (timeUntilNext == undefined)
                {
                    timeUntilNext = "";
                }
                
                if (this.getAllNextQuestsInChain(key) === undefined)
                {
                    leadsTo = "";
                }
                
                if (!this.Instance.getPath())
                {
                    database.locales.global[localeID][`${key} description`] = collector + lightKeeper + leadsTo + timeUntilNext + keyDesc + durability + requiredParts + originalDesc;
                }     
            }
        });
    }
}

module.exports = { mod: new DExpandedTaskText() }