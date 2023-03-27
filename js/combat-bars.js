import { MonksCombatDetails, i18n, log, setting } from "../snoopie-combat-details.js";

export class CombatBars {
    static init() {
        Hooks.on("updateCombat", async function (combat, delta) {
            let combatStarted = (combat && (delta.round === 1 && combat.turn === 0 && combat.started === true));

            //if we're using combat bars and the combat starts or stops, we need to refresh the tokens
            if (setting('add-combat-bars') && combatStarted) {
                for (let combatant of combat.combatants) {
                    let token = combatant.token; //canvas.tokens.placeables.find(t => { return t.id == combatant._token.id; });
                    if (token) {
                        let displayBars = token.displayBars;
                        let combatBar = token.getFlag('monks-combat-details', 'displayBarsCombat');
                        combatBar = (combatBar == undefined || combatBar == -1 ? displayBars : combatBar);

                        if (combatBar != displayBars) {
                            if (displayBars == 0)
                                token.object.drawBars();
                            token.object.refresh();
                        }
                    }
                }
            }
        });

        Hooks.on('renderTokenConfig', function (app, html, options) {
            let displayBars = $('[name="displayBars"]', html).parents('div.form-group');
            let combatBars = displayBars.clone(true);

            let value = (app.object instanceof TokenDocument ? app.object.getFlag('monks-combat-details', 'displayBarsCombat') : getProperty(app.object.token, "flags.monks-combat-details.displayBarsCombat"));

            $('[name="displayBars"]', combatBars).attr('name', 'flags.monks-licombatttle-details.displayBarsCombat').prepend($('<option>').attr('value', '-1').html('')).val(value);
            $('> label', combatBars).html(i18n("MonksCombatDetails.CombatDisplayBars"));
            combatBars.insertAfter(displayBars);
        });

        Hooks.on("deleteCombat", function (combat) {
            //if we're using combat bars and the combat starts or stops, we need to refresh the tokens
            if (setting('add-combat-bars') && combat) {
                for (let combatant of combat.combatants) {
                    let token = combatant.token; //canvas.tokens.placeables.find(t => { return t.id == combatant._token.id; });
                    if (token) {
                        let displayBars = token.displayBars;
                        let combatBar = token.getFlag('monks-combat-details', 'displayBarsCombat');
                        combatBar = (combatBar == undefined || combatBar == -1 ? displayBars : combatBar);

                        if (token.object.bars.alpha != 1) {
                            token.object.bars.alpha = 1;
                            token.object.refresh();
                        } else if (combatBar != displayBars)
                            token.object.refresh();

                        token.object.drawBars();
                    }
                }
            }
        });

        Hooks.on("refreshToken", (token) => {
            //if this token is part of a combat, then always show the bar, but at 0.5 opacity, unless controlled
            if (MonksCombatDetails.isDefeated(token))
                return;

            if (token.inCombat) {
                let combatBar = token.document.getFlag('monks-combat-details', 'displayBarsCombat');
                if (combatBar != undefined && combatBar != -1) {
                    token.bars.visible = CombatBars.canViewCombatMode.call(token, combatBar);
                    token.bars.alpha = ((token.controlled && (combatBar == CONST.TOKEN_DISPLAY_MODES.CONTROL || combatBar == CONST.TOKEN_DISPLAY_MODES.OWNER || combatBar == CONST.TOKEN_DISPLAY_MODES.ALWAYS)) ||
                        (token.hover && (combatBar == CONST.TOKEN_DISPLAY_MODES.HOVER || combatBar == CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER)) ? 1 : setting("combat-bar-opacity"));
                }
            } else {
                if (token?.bars?.alpha)
                    token.bars.alpha = 1;
            }
        });

        let tokenDrawBars = function (wrapped, ...args) {
            if (this.inCombat && this.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE && this.document.flags['monks-combat-details']?.displayBarsCombat !== CONST.TOKEN_DISPLAY_MODES.NONE) {
                this.document.displayBars = 5;
                wrapped.call(this, ...args);
                this.document.displayBars = CONST.TOKEN_DISPLAY_MODES.NONE;
            } else
                wrapped.call(this, ...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-combat-details", "Token.prototype.drawBars", tokenDrawBars, "WRAPPER");
        } else {
            const oldTokenDrawBars = Token.prototype.drawBars;
            Token.prototype.drawBars = function () {
                return tokenDrawBars.call(this, oldTokenDrawBars.bind(this), ...arguments);
            }
        }

        let tokenRefreshHUD = function (wrapped, ...args) {
            wrapped.call(this, ...args);
            if (this.inCombat) {
                let combatBar = this.document.getFlag('monks-combat-details', 'displayBarsCombat');
                if (combatBar != undefined && combatBar != -1) {
                    this.bars.visible = CombatBars.canViewCombatMode.call(this, combatBar);
                }
            }
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-combat-details", "Token.prototype.refreshHUD", tokenRefreshHUD, "WRAPPER");
        } else {
            const oldTokenRefreshHUD = Token.prototype.refreshHUD;
            Token.prototype.refreshHUD = function () {
                return tokenRefreshHUD.call(this, oldTokenRefreshHUD.bind(this), ...arguments);
            }
        }
    }

    static canViewCombatMode(mode) {
        if (mode === CONST.TOKEN_DISPLAY_MODES.NONE) return false;
        else if (mode === CONST.TOKEN_DISPLAY_MODES.ALWAYS) return true;
        else if (mode === CONST.TOKEN_DISPLAY_MODES.CONTROL) return this.isOwner;
        else if (mode === CONST.TOKEN_DISPLAY_MODES.HOVER) return true;
        else if (mode === CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER) return this.isOwner;
        else if (mode === CONST.TOKEN_DISPLAY_MODES.OWNER) return this.isOwner;
        return false;
    }

    static updateToken(document, data) {
        if (data?.flags && data?.flags['monks-combat-details']?.displayBarsCombat) document?._object?.drawBars();
    }
}