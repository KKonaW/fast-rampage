const JOB_ZERK = 3;
let rbIds = [380100,330100,360100,360130,360131]
let hitIds = [380100,330100,360100,360130,360131]

module.exports = function ValkFastRB(mod) {
	const { command } = mod.require
	let gameId = 0n,
		model = 0,
		job = 0;
	let goodClass = false;
	let runes = 0, castedRunes = 0, hitRunes = 0;
	let canceler =  [], blocker = [], unblocker = [], safeAction = [];
	let aspd;
	
	command.add('zerk', (arg,value) =>{
		if(!arg){
			mod.settings.enabled = !mod.settings.enabled;
			command.message("fast-rampage module is now :" + (mod.settings.enabled?"Enabled":"Disabled"));
			mod.saveSettings();
			return;
		}
		switch(arg){
			case 'on':
				mod.settings.enabled = true;
				command.message("fast-rampage module is now" + (mod.settings.enabled?"Enabled":"Disabled"));
				break;
			case 'off':
				mod.settings.enabled = false;
				command.message("fast-rampage module is now" + (mod.settings.enabled?"Enabled":"Disabled"));
				break;
			case 'ping':
				if( !value || isNaN(value) ){
					command.message('Ping amount has to be a number')
				}
				else{
					mod.settings.myAveragePing = Number(value);
					command.message("Average ping set to" + value);
				}
				break;
			default:
				command.message("Unknown command. Available commands are : on|off");
				break;
		}
		mod.saveSettings();
	});
	
	mod.hook('S_LOGIN', 14, { order : Infinity }, event => {
	    gameId = event.gameId;
	    model = event.templateId;
	    job = (model - 10101) % 100;
	    goodClass = [JOB_ZERK].includes(job);
	});

	mod.hook('S_WEAK_POINT', 1, event => {
		runes = event.runemarksAdded;
	})
	
	mod.hook('S_PLAYER_STAT_UPDATE', ( (mod.clientInterface==undefined) ? 15 : 16 ), (event) => {
		aspd = (event.attackSpeed + event.attackSpeedBonus) / event.attackSpeed;
	});
	
	mod.hook('S_ACTION_STAGE', 9, {	filter: {fake: null} }, event => {
		if(event.gameId != gameId) return;
		if( rbIds.includes( event.skill.id ) ) return;
		for(let cast in canceler) mod.unhook(canceler[cast])
		canceler = [];
		for(let block in blocker) mod.unhook(blocker[block])
		blocker = [];
		for(let unblock in unblocker) mod.clearTimeout(unblocker[unblock])
		unblocker = [];
	})
	
    mod.hook('C_START_SKILL', 7, { filter: { fake: null } }, event => {
        if (!mod.settings.enabled) return;
		if( ! rbIds.includes( event.skill.id ) ) return;		
		safeAction.push( mod.hook('S_ACTION_END', 5, { filter: { fake: null } }, (event)=>{
			if(!mod.settings.enabled || !goodClass) return
			if(event.gameId != gameId) return;
				if( rbIds.includes(event.skill.id) ){
					for(let safe in safeAction) mod.unhook(safeAction[safe])
					safeAction = [];
					return;
				}else {
					event.type = 4;
					return true;
				}
		}))
    });
	
	mod.hook('S_ACTION_STAGE', 9, { filter: {fake: null} }, event => {
		if(!mod.settings.enabled || !goodClass) return;
		if(event.gameId != gameId) return;
		if( !( rbIds ).includes( event.skill.id ) ) return;
		event.effectScale = 1;
		switch(mod.settings.mode){
			case 'hits':
				castedRunes = runes;
				hitRunes = 0;
				blocker.push(mod.hook('C_START_SKILL', 7, {order: -Infinity}, (event)=>{
					if(![140100,140101,140199].includes(event.skill.id)) return false;
				}))
				canceler.push(mod.hook('S_EACH_SKILL_RESULT', 14, (e)=>{
					if( !( hitIds.includes(e.skill.id) ) ) return;
						hitRunes++;
						if(hitRunes == castedRunes || hitRunes == mod.settings.setRunes){
							mod.toClient('S_ACTION_END', 5, {
								gameId : gameId,
								loc: event.loc,
								w: event.w,
								templateId: model,
								skill: event.skill.id,
								type: 999999,
								id: event.id
							});
							for(let cast in canceler) mod.unhook(canceler[cast])
							canceler = [];
							for(let block in blocker) mod.unhook(blocker[block])
							blocker = [];
							for(let unblock in unblocker) mod.clearTimeout(unblocker[unblock])
							unblocker = [];
						}
				}))
				unblocker.push(mod.setTimeout(()=>{
					mod.toClient('S_ACTION_END', 5, {
						gameId : gameId,
						loc: event.loc,
						w: event.w,
						templateId: model,
						skill: event.skill.id,
						type: 999999,
						id: event.id
					});
					for(let cast in canceler) mod.unhook(canceler[cast])
					canceler = [];
					for(let block in blocker) mod.unhook(blocker[block])
					blocker = [];
					for(let unblock in unblocker) mod.clearTimeout(unblocker[unblock])
					unblocker = [];
				}, 1300 +  mod.settings.myAveragePing))
				break;
			case 'delay':
				if(rbIds.includes(event.skill.id)){
					mod.setTimeout(() => {
						mod.toClient('S_ACTION_END', 5, {
							gameId : gameId,
							loc: event.loc,
							w: event.w,
							templateId: model,
							skill: event.skill.id,
							type: 999999,
							id: event.id
						});
					}, mod.settings.delay);
				}
				break;
			default:
				command.message('Please correct your selected cancel mode!');
				console.error('Please correct your selected cancel mode!');
				break;
		}
		return true;
	});

	mod.hook('S_ACTION_END', 5, {order: -Infinity, filter: {fake: null}}, event => {
		if(!mod.settings.enabled || !goodClass) return
			if(event.gameId != gameId) return;
				if(rbIds.includes(event.skill.id)) {
					if(event.type == 999999){
						event.type = 4;
						return true;
					}
					else
						return false;
				}
	});
}
