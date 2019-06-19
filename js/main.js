/*  main.js
    Hearthstone Collection Tracker
*/
let HSCollectionTracker = (function() {
	/*********************************************************
	***************************DATA***************************
	*********************************************************/
	let classesEnum = {
		neutral: "neutral",
		druid: "druid",
		hunter: "hunter",
		mage: "mage",
		paladin: "paladin",
		priest: "priest",
		rogue: "rogue",
		shaman: "shaman",
		warlock: "warlock",
		warrior: "warrior"
	};
	
	let raritiesEnum = {
		free: "free",
		common: "common",
		rare: "rare",
		epic: "epic",
		legendary: "legendary"
	};
	
	let setsEnum = {
		basic: "basic",
		classic: "classic",
		hof: "hof",
		naxxramas: "naxxramas",
		gvg: "gvg",
		blackrock: "blackrock",
		tgt: "tgt",
		loe: "loe",
		wotog: "wotog",
		onik: "onik",
		msog: "msog",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan",
		ros: "ros"
	};

	let standardSetsEnum = {
		basic: "basic",
		classic: "classic",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan",
		ros: "ros"
	};

	// The number of cards and craftable cards in each set.
	// Created dynamically when visiting progress page/pack guide
	let setsCards;
	
	// Lists which card qualities are uncraftable for each set
	let setsUncraftable = {
		basic: "both",
		classic: "none",
		//reward: "none",
		//promo: "golden",
		hof: "none",
		naxxramas: "none",
		gvg: "none",
		blackrock: "none",
		tgt: "none",
		loe: "none",
		wotog: "none",
		ungoro: "none",
		kotft: "none",
		kobolds: "none",
		witchwood: "none",
		boomsday: "none",
		rastakhan: "none",
		ros: "none"
	};
	
	let packsEnum = {
		classic: "classic",
		gvg: "gvg",
		tgt: "tgt",
		wotog: "wotog",
		msog: "msog",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan",
		ros: "ros"
	};
	
	let rewardsEnum = {
		classic: "classic",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan",
		ros: "ros"
	};	
	
	let craftingCost = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 40, golden: 400 },
		rare:      { normal: 100, golden: 800 },
		epic:      { normal: 400, golden: 1600 },
		legendary: { normal: 1600, golden: 3200 }
	};
	
	let disenchantmentValue = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 5, golden: 50 },
		rare:      { normal: 20, golden: 100 },
		epic:      { normal: 100, golden: 400 },
		legendary: { normal: 400, golden: 1600 }
	};
	
	// Chance of getting a card of a specific quality when opening packs.
	// For each card, not in total.
	// Source: http://hearthstone.gamepedia.com/Card_pack_statistics#Golden_cards
	let chanceOfGetting = {
		common:    { normal: 0.7037, golden: 0.0148 },
		rare:      { normal: 0.216, golden: 0.0127 },
		epic:      { normal: 0.0408, golden: 0.0019 },
		legendary: { normal: 0.0094, golden: 0.0007 }
	};

	// Keeps track of how many cards and how much dust is missing
	let missingCards = {};
	let missingDust = {};

	// The collection of cards, divided by classes
	let classes = {};
	let classAll = {};

	// Class and card quality currently selected in the tracker
	let selectedClass = "all";
	let selectedQuality = "normal";
	
	// Persistent settings
	let settings = {
		excludeGoldenCards: false,
		hideFreeCards: false,
		showOnlyMissingCards: false
	};
	
	let filterBySet = "standard";
	let progressSet = ""; // Chosen set for the progress table
	
	// Currently unused
	let currentDust = 0;
	let disenchantedDust = 0;
	
	let version = 2.4;
	
	// Card object
	function card(name, rarity, mana, type, className, set, uncraftable) {
		this.name = name;
		this.rarity = rarity;
		this.mana = mana;
		this.type = type;
		this.className = className;
		this.set = set;
		this.uncraftable = uncraftable;
		this.normal = 0;
		this.golden = 0;
	}
	
	// Class object
	function classHS(name) {
		this.name = name;
		this.level = 1; // Currently unused
		this.cards = {
			free: {},
			common: {},
			rare: {},
			epic: {},
			legendary: {}
		};
		// Adds a card to this class
		this.addCard = function(card) {
			let rarity = card.rarity, set = card.set;
			let copies = getMaxCopies(rarity);
			this.cards[rarity][card.name] = card;

			if (this.name == 'all')
				return;

			for (let i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
				updateMissingCards(card, quality, copies);
				
				if (isCraftable(card, quality)) {
					let craftingCost = getCraftingCost(card, quality, copies);
					
					updateMissingDust(card, quality, craftingCost);
				}
			}
		}
	}
	/*********************************************************
	**************************UTILS***************************
	*********************************************************/	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function addThousandSeparator(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	
	function getMissingDataObject() {
		return {
				free:      { normal: 0, golden: 0 },
				common:    { normal: 0, golden: 0 },
				rare:      { normal: 0, golden: 0 },
				epic:      { normal: 0, golden: 0 },
				legendary: { normal: 0, golden: 0 },
				total:       { normal: 0, golden: 0 }
			};
	}
	
	function getProgressDataObject() {
		return {
				free:      0,
				common:    0,
				rare:      0,
				epic:      0,
				legendary: 0,
				total:     0,
				all:       0
			};
	}
	
	function createProgressData(quality, sets, className) {
		let data = {
			totalCards: getProgressDataObject(),
			missingCards: getProgressDataObject(),
			totalDust: getProgressDataObject(),
			missingDust: getProgressDataObject()
		};
		
		for (let set in sets)
			for (let rarity in setsCards[set]) {
				if (setsCards[set][rarity][className] != undefined) {
				    data.totalCards[rarity] += setsCards[set][rarity][className].cards;
					data.totalCards.all += setsCards[set][rarity][className].cards;
				}
				// Total row has its own data
				if (className != "total") {
			        data.missingCards[rarity] += missingCards.classes[className][set][rarity][quality];
					data.missingCards.all += missingCards.classes[className][set][rarity][quality];
				}
				else {
					data.missingCards[rarity] += missingCards.overall[set][rarity][quality];
					data.missingCards.all += missingCards.overall[set][rarity][quality];
				}
				
				if(setsUncraftable[set] != "both" && setsUncraftable[set] != quality && setsCards[set][rarity][className] != undefined) {
				    data.totalDust[rarity] += setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
					data.totalDust.all += setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
					
					if (className != "total") {
			            data.missingDust[rarity] += missingDust.classes[className][set][rarity][quality];
						data.missingDust.all += missingDust.classes[className][set][rarity][quality];
					}
				    else {
						data.missingDust[rarity] += missingDust.overall[set][rarity][quality];
						data.missingDust.all += missingDust.overall[set][rarity][quality];
					}
				}
			}
			
		return data;
	}

	function getData(fileName) {
		let data;
		
		let request = new XMLHttpRequest();
		request.open("GET", "data/" + fileName + ".json", false);
		request.onreadystatechange = function () {
			if(request.readyState === 4) {
				if(request.status === 200 || request.status == 0) {
					data = JSON.parse(request.responseText);
				}
			}
		}
		request.send(null);
		
		return data;
	}
	
	// Get card data from Hearthstone API
	async function getCardData() {
		try {
			let request = await fetch("/cardData");
			let cardData = await request.json();
			return cardData;
		}
		catch (error) {
			console.log(error);
		}
	}
	/*********************************************************
	**************************INIT****************************
	*********************************************************/
	function initCollection(cardData) {
		initMissingData();
		initClasses();
		
		importCards(cardData);
		
		for (let className in classes)
			sortCards(className);

		initClassAll();
	}

	function initClassAll() {
		classAll = new classHS('all');

		for (let className in classes)
			for (let rarity in classes[className].cards) {
				let cards = classes[className].cards[rarity];
				
				for (let cardName in cards)
					classAll.addCard(cards[cardName]);
			}

		sortCards('all');
	}
	
	function initClasses() {
		for (let className in classesEnum)
			classes[className] = new classHS(className);
	}
	
	function initMissingData() {
		for (let i = 0, missingData = missingCards; i < 2; i++, missingData = missingDust) {
			missingData.classes = {};
			for (let className in classesEnum) {
				missingData.classes[className] = {};
				for (let set in setsEnum)
					missingData.classes[className][set] = getMissingDataObject();
				missingData.classes[className].total = getMissingDataObject();
			}
			missingData.overall = {};
			for (let set in setsEnum)
				missingData.overall[set] = getMissingDataObject();
			
			missingData.overall.total = getMissingDataObject();
		}
	}

	function initSelectedQuality() {		
		let selectedQualityNormal = document.getElementById("selectedQualityNormal");
		let selectedQualityGolden = document.getElementById("selectedQualityGolden");
		
		selectedQualityNormal.addEventListener("click", function() { setSelectedQuality(this); });
		selectedQualityGolden.addEventListener("click", function() { setSelectedQuality(this); });
    }

	function initEventListeners() {
		document.getElementById("link-tracker").addEventListener("click", displayTracker);
		document.getElementById("link-progress").addEventListener("click", displayProgress);
		document.getElementById("link-packs").addEventListener("click", displayPacks);
		document.getElementById("link-recipes").addEventListener("click", displayRecipes);
		document.getElementById("link-news").addEventListener("click", displayNews);
		document.getElementById("link-about").addEventListener("click", displayAbout);
		document.getElementById("link-importHSReplay").addEventListener("click", displayImportHSReplay);
		document.getElementById("link-export").addEventListener("click", exportCollection);
		document.getElementById("link-import").addEventListener("click", function() {
			// Check for File API support
			if (window.File && window.FileReader && window.FileList) {
				let elem = document.getElementById("files");
				elem.value = ""; // Allows multiple imports
				let event = new MouseEvent('click', {
					'view': window,
					'bubbles': true,
					'cancelable': true
				});
				elem.dispatchEvent(event); // Manually trigger the file input
			} else alert('Importing is not supported in this browser.');
		});		
		document.getElementById("files").addEventListener("change", importCollection);
	}
	
	function switchClassicPack() {
		let image = document.getElementById("imageClassicPack");
		
		if (!image.src.includes("golden")) {
			image.src = "images/pack_classic_golden.png";
			image.alt = "Golden Classic Pack";
			image.width = 157;
			
			let averageValue = calculatePackValue("classic", true);
		
			document.getElementById("classicAverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
		else {
			image.src = "images/pack_classic.png";
			image.alt = "Classic Pack";
			image.width = 160;
			
			let averageValue = calculatePackValue("classic");
		
			document.getElementById("classicAverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
	}
	
	// Initializes setsCards.
	// setsCards[set][rarity][className].cards = total cards
	// setsCards[set][rarity][className][quality] = craftable cards
	function initSetsCards() {
		setsCards = {};
		
		// Add the rarities to the set (to get them in the "correct" order)
		for (let set in setsEnum)
			setsCards[set] = { 	free: {},
								common: {},
								rare: {},
								epic: {},
								legendary: {}
			};
		
		// Loop through every card in the collection and add
		// the card's copies to its correct places
		for (let className in classes)
			for (let rarity in classes[className].cards)
				for (let cardName in classes[className].cards[rarity]) {
					let card = classes[className].cards[rarity][cardName];
					let set = card.set;		
					
					// Add the class to the rarity group if it doesn't exist
					if (setsCards[set][rarity][className] === undefined)
						setsCards[set][rarity][className] = {};
					
					if (setsCards[set][rarity][className].cards === undefined)
						setsCards[set][rarity][className].cards = 0;
					
					setsCards[set][rarity][className].cards += getMaxCopies(rarity);

					for (let i = 0, quality = "normal"; i < 2; i++, quality = "golden") {					
						if (setsCards[set][rarity][className][quality] === undefined)
							setsCards[set][rarity][className][quality] = 0;
						
						if (isCraftable(card, quality))
							setsCards[set][rarity][className][quality] += getMaxCopies(rarity);
					}
					
					// Add total to the rarity group if it doesn't exist
					if (setsCards[set][rarity].total === undefined)
						setsCards[set][rarity].total = {};
					
					if (setsCards[set][rarity].total.cards === undefined)
						setsCards[set][rarity].total.cards = 0;
					
					setsCards[set][rarity].total.cards += getMaxCopies(rarity);
					
					// Not used right now
					for (let i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
						if (setsCards[set][rarity].total[quality] === undefined)
							setsCards[set][rarity].total[quality] = 0;
						
						if (isCraftable(card, quality))
							setsCards[set][rarity].total[quality] += getMaxCopies(rarity);
					}
				}
		
		// Delete rarities not used in the set
		for (let set in setsEnum)
			for (let rarity in raritiesEnum)
				if (Object.keys(setsCards[set][rarity]).length == 0)
					delete(setsCards[set][rarity]);
		
		// Overall for all sets
		setsCards.total = {};
		for (let set in setsCards) {
			if (set === "total") break;
			for (let rarity in setsCards[set])
				for (let className in setsCards[set][rarity]) {
					// Add the rarity to the set if it doesn't exist
					if (setsCards.total[rarity] === undefined)
						setsCards.total[rarity] = {};
					
					// Add the class to the rarity group if it doesn't exist
					if (setsCards.total[rarity][className] === undefined)
						setsCards.total[rarity][className] = {};
					
					if (setsCards.total[rarity][className].cards === undefined)
						setsCards.total[rarity][className].cards = 0;
					
					setsCards.total[rarity][className].cards += setsCards[set][rarity][className].cards;
					
					for (let i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
						if (setsCards.total[rarity][className][quality] === undefined)
							setsCards.total[rarity][className][quality] = 0;
						
						setsCards.total[rarity][className][quality] += setsCards[set][rarity][className][quality];
					}					
				}
		}		
	}

	function initHearthpwnTooltips() {
		let deferreds = [];

		// List of hearthstone cards grabbed 2016-03-31 from this chrome extension:
		// https://chrome.google.com/webstore/detail/hearthstone-linkifier/hgfciolhdhbagnccplcficnahgleflam
		// ^ Not updated anymore.
		//
		// Most valuable here are IDs in hearthpwn.com and wowhead.com databases.
		if (!window.HS_CardData) {
			let promise = (function() {
				let deferred = jQuery.Deferred();
				let request = new XMLHttpRequest();
				request.open("GET", "data/card-ids.json");
				request.onreadystatechange = function () {
					if(request.readyState === 4) {
						if(request.status === 200 || request.status == 0) {
							try {
								deferred.resolve(JSON.parse(request.responseText));
								return;
							} catch (e) {
								console.log('Error getting card IDs');
								console.log(e);
							}
						}
						deferred.reject();
					}
				}
				try {
					request.send(null);
				} catch(e) {
					console.log('Error getting card IDs');
					console.log(e);
					deferred.reject();
				}
				return deferred.promise();
			})();
			deferreds.push(promise.then(function(data) {
				window.HS_CardData = data;
			}));
		}

		// HearthPwn tooltip script
		// http://www.hearthpwn.com/tooltips
		if (!window.CurseTips) {
			let tt_url = '//static-hearth.cursecdn.com/current/js/syndication/tt.js';
			if (location.protocol == 'file:') {
				tt_url = 'http:' + tt_url;
			}

			// HearthPwn's tooltip script does not like being $.getScript()'ed.
			// It errs when it can't find its <script>. So, we have to include it by hand.
			let promise = (function() {
				let deferred = jQuery.Deferred();
				let $script = $('<script>').prop('src', tt_url).on("load error", function(e) {
					if (e.type === "error") {
						deferred.reject();
					} else {
						deferred.resolve();
					}
				});
				document.head.appendChild($script[0]);
				return deferred.promise();
			})();
			deferreds.push(promise);
		}

		// Init tooltips when dependencies are loaded
		return $.when.apply($, deferreds).then(function() {

			initTooltipDelay();

			// maps card name to hearthpwn id
			let card_ids = {};
			HS_CardData.forEach(function(card) {
				card_ids[card.name] = card.hpid;
			});
			let href_tmpl = 'http://www.hearthpwn.com/cards/%d';

			// Listen to mouse events and init tooltips on the fly
			$(document.body).on('mouseover', '#classCards li a', function(evt) {
				let $a = $(this);
				if ($a.hasClass('buttonAll') || $a.attr('data-tooltip-href')) {
					return;
				}
				let card_name = $a.text();
				if (!card_ids[card_name]) {
					return;
				}
				$a.attr('data-tooltip-href', href_tmpl.replace('%d', card_ids[card_name]));
				CurseTips['hearth-tooltip'].watchElements([$a[0]]);
				CurseTips['hearth-tooltip'].createTooltip(evt);
			});

			// Monkey-patch to delay showing tooltip
			function initTooltipDelay() {
				let mouseenter_ts = 0;
				let last_card_id = null;
				let self = CurseTips['hearth-tooltip'];

				// 100ms delay between mouseenter and requesting data
				let origCreateTooltip = self.createTooltip;
				self.createTooltip = function(q) {
					mouseenter_ts = Date.now();
					let card_id = last_card_id = (q.currentTarget.getAttribute("data-tooltip-href")||'').split('/').pop().split('?')[0];
					if (last_card_id) {
						q = $.extend({}, q);
						setTimeout(function() {
							if (card_id == last_card_id) {
								origCreateTooltip.call(self, q);
							}
						}, 100);
					}
				};

				// 500ms delay between mouseenter and showing tooltip
				let origHandleTooltipData = self.handleTooltipData;
				self.handleTooltipData = function(p) {
					let args = arguments;
					if (!p) {
						last_card_id = null;
						return origHandleTooltipData.apply(self, args);
					}
					setTimeout(function() {
						if (p.Id == last_card_id) {
							origHandleTooltipData.apply(self, args);
						}
					}, Math.max(0, 500 - (Date.now() - mouseenter_ts)));
				};
			}
		});
	}

	/*********************************************************
	**********************LOCAL STORAGE***********************
	*********************************************************/
	function loadLocalStorage() {
		classes = JSON.parse(localStorage.getItem('classes'));
		missingCards = JSON.parse(localStorage.getItem("missingCards"));
		missingDust = JSON.parse(localStorage.getItem("missingDust"));
		currentDust = parseInt(localStorage.getItem("currentDust"));
		disenchantedDust = parseInt(localStorage.getItem("disenchantedDust"));
		// In case user has never changed a setting
		if (localStorage.getItem("settings") !== null)
		    settings = JSON.parse(localStorage.getItem("settings"));
	}
	
	function updateLocalStorage() {
		localStorage.setItem('classes', JSON.stringify(classes));
		localStorage.setItem('missingCards', JSON.stringify(missingCards));
		localStorage.setItem('missingDust', JSON.stringify(missingDust));
	}
	/*********************************************************
	**********************CARD FUNCTIONS**********************
	*********************************************************/
	// Imports cards from the Hearthstone API
	function importCards(cardData) {
		// Maps Hearthstone API set names to HSCT setsEnum
		let setMap = {
			"Basic": setsEnum.basic,
			"Classic": setsEnum.classic,
			"Hall of Fame": setsEnum.hof,
			"Naxxramas": setsEnum.naxxramas,
			"Goblins vs Gnomes": setsEnum.gvg,
			"Blackrock Mountain": setsEnum.blackrock,
			"The Grand Tournament": setsEnum.tgt,
			"The League of Explorers": setsEnum.loe,
			"Whispers of the Old Gods": setsEnum.wotog,
			"One Night in Karazhan": setsEnum.onik,
			"Mean Streets of Gadgetzan": setsEnum.msog,
			"Journey to Un'Goro": setsEnum.ungoro,
			"Knights of the Frozen Throne": setsEnum.kotft,
			"Kobolds & Catacombs": setsEnum.kobolds,
			"The Witchwood": setsEnum.witchwood,
			"The Boomsday Project": setsEnum.boomsday,
			"Rastakhan's Rumble": setsEnum.rastakhan,
			"Rise of Shadows": setsEnum.ros
		};

		for (let set in setMap) {
			let HSCTset = setMap[set];
				
			if (HSCTset)
				for (let i = 0; i < cardData[set].length; i++) {
					let newCard = cardData[set][i];
						
					if (!newCard.cardId.includes("HERO")) {						
						let className = newCard.playerClass.toLowerCase();
						let rarity = newCard.rarity.toLowerCase();
						
						classes[className].addCard(new card(newCard.name, rarity, newCard.cost, newCard.type.toLowerCase(), className, HSCTset, setsUncraftable[HSCTset]));
					}
				}
			else console.log("Set not found");
		}			

	}
	
	// Sorts all the card lists for the specified class.
	// Sorting order:
	// Mana cost: Lower > higher
	// Name: Lexicographical order
	function sortCards(className) {
		if (className == 'all')
			var cardList = classAll.cards;
		else
			var cardList = classes[className].cards;
		
		for (let rarity in cardList) {
			let sortedArray = [];
			for (let name in cardList[rarity])
				sortedArray.push([name, cardList[rarity][name]]);
			sortedArray.sort(function(a, b) {
			    return a[1].mana == b[1].mana ?
				a[1].name.localeCompare(b[1].name) :
				a[1].mana - b[1].mana;
				});
			
			let sortedList = {};
			for (let i = 0; i < sortedArray.length; ++i)
				if (sortedArray[i] !== undefined)
					sortedList[sortedArray[i][0]] = sortedArray[i][1];
		
			cardList[rarity] = sortedList;
		}
	}
	
	// Adds or removes copies of a card
	function updateCard(card, quality, copies) {
		if (card != undefined) {
			card[quality] += copies;
			updateMissingCards(card, quality, -copies);
		
			if (isCraftable(card, quality)) {
				let craftingCost = getCraftingCost(card, quality, copies);
		
				updateMissingDust(card, quality, -craftingCost);
			}
		}
	}
	
	// Updates missingCards by the amount of copies specified
	function updateMissingCards(card, quality, copies) {
		let className = card.className, set = card.set, rarity = card.rarity;
		
		missingCards.classes[className][set][rarity][quality] += copies;
		missingCards.classes[className][set].total[quality] += copies;
		missingCards.classes[className].total[rarity][quality] += copies;
		missingCards.classes[className].total.total[quality] += copies;

		missingCards.overall[set][rarity][quality] += copies;
		missingCards.overall[set].total[quality] += copies;
		missingCards.overall.total[rarity][quality] += copies;
		missingCards.overall.total.total[quality] += copies;
	}
	
	// Updates missingDust by the amount of dust specified
	function updateMissingDust(card, quality, dust) {
		let className = card.className, set = card.set, rarity = card.rarity;
		
		missingDust.classes[className][set][rarity][quality] += dust;
		missingDust.classes[className][set].total[quality] += dust;
		missingDust.classes[className].total[rarity][quality] += dust;
		missingDust.classes[className].total.total[quality] += dust;

		missingDust.overall[set][rarity][quality] += dust;
		missingDust.overall[set].total[quality] += dust;
		missingDust.overall.total[rarity][quality] += dust;
		missingDust.overall.total.total[quality] += dust;
	}
	
	// Adds a copy of a card through clicking on an <li><a> element
	function addCard(card) {
		let rarity = card.rarity;
		
		if (card[selectedQuality] < getMaxCopies(rarity)) {
			updateCard(card, selectedQuality, 1);
			
		    updateLocalStorage();
			displayCards(selectedClass);
			displayMissingCards();
			displayMissingCardsOverall();
			displayMissingDust();
			displayMissingDustOverall();
		}
	}
	
	// Removes a copy of a card through right-clicking on an <li><a> element
	function removeCard(card) {
		let rarity = card.rarity;
		
		if (card[selectedQuality] > 0) {
		    updateCard(card, selectedQuality, -1);
		
			updateLocalStorage();
			displayCards(selectedClass);
			displayMissingCards();
			displayMissingCardsOverall();
			displayMissingDust();
			displayMissingDustOverall();
		}
	}	
	
	// Adds max amount of copies to all cards in the column that was selected
	// by clicking on the "apply to all" button
	function addAll(element) {
		let list = element.parentNode.parentNode.getElementsByTagName("a");
		let rarity = element.parentNode.parentNode.getAttribute("class");
		
		for (let i = 1, len = list.length; i < len; i++) {
			let card;

			if (selectedClass == "all")
				card = classAll.cards[rarity][list[i].innerHTML];
			else card = classes[selectedClass].cards[rarity][list[i].innerHTML];

			if (card[selectedQuality] < getMaxCopies(rarity))
			    updateCard(card, selectedQuality, getMaxCopies(rarity) - card[selectedQuality]);
		}
		
		updateLocalStorage();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}
	
	// Removes all copies of all cards in the column that was selected
	// by right-clicking on the "apply to all" button
	function removeAll(element) {
		let list = element.parentNode.parentNode.getElementsByTagName("a");
		let rarity = element.parentNode.parentNode.getAttribute("class");
		
		for (let i = 1, len = list.length; i < len; i++) {
			let card;

			if (selectedClass == "all")
				card = classAll.cards[rarity][list[i].innerHTML];
			else card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
			if (card[selectedQuality] > 0)
			    updateCard(card, selectedQuality, -card[selectedQuality]);
		}
		
		updateLocalStorage();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}
	
	// Changes the selected quality through clicking on the top buttons
	function setSelectedQuality(element) {
		if (element.getAttribute("id") === "selectedQualityNormal")
			document.getElementById("selectedQualityGolden").classList.remove("selected");
		else document.getElementById("selectedQualityNormal").classList.remove("selected");
		
		selectedQuality = element.innerHTML.toLowerCase();
		element.classList.add("selected");
    }
	
	function getMaxCopies(rarity) {
		return rarity === "legendary" ? 1 : 2;
	}
	
	function isCraftable(card, quality) {
		return card.uncraftable !== "both" && card.uncraftable !== quality;
	}
	
	function getCraftingCost(card, quality, copies) {
		return craftingCost[card.rarity][quality] * copies;
	}
	/*********************************************************
	*************************DISPLAY**************************
	*********************************************************/
	// Displays the class tabs and the class tabs bar.
	// Created dynamically except filter options
	function displayClassTabs() {
		let div = document.getElementById("classTabs");
		let list = document.createElement("ul");
		
		// Set the CSS color of the class tabs bar (default neutral)
		let classTabsClass = document.getElementById("classTabsBar").getAttribute("class");		
		document.getElementById("classTabsBar").setAttribute("class", classTabsClass + " " + selectedClass);
		
		// Create the class tabs
		createClassTab = function (className) {
			let listItem = document.createElement("li");
			listItem.setAttribute("class", "col-xs-11ths nopadding");
			let listItemLink = document.createElement("a");
			let span = document.createElement("span");
			if (className in classes)
				span.innerHTML = classes[className].level; // Always level 1 for now
			else
				span.innerHTML = 1;
			/* ---------------------------------------------
			 To enable users to manually enter class levels.
			 Not yet implemented

			 //span.setAttribute("contenteditable", true);
			 /* BECAUSE EVENT LISTENERS NO WORKY ON THIS SPAN.
			 USE FORM INSTEAD? */
			/*span.setAttribute("onkeypress", "return handleKey(this, event)");
			 span.setAttribute("onblur", "lol(this)");
			 span.setAttribute("onpaste", "return false");
			 span.setAttribute("ondrop", "return false");*
			 /* --------------------------------------------- */
			listItemLink.appendChild(span);

			// Displays the class levels, but it's pointless for now
			//if (className === "neutral")
			listItemLink.innerHTML = className;
			//else {
			//	listItemLink.innerHTML = className + "<br>(" + listItemLink.innerHTML;
			//	listItemLink.innerHTML += ")";
			//}

			// Closure function for when clicking on a class tab
			(function (className) {
				listItemLink.addEventListener("click", function() {
					// Switch class tabs color and selected class
					document.getElementById("classTabsBar").setAttribute("class",
						classTabsClass + " " + className);
					selectedClass = className;

					// No need to re-display the class tabs
					displayCards(className);
					displayMissingCards();
					displayMissingDust();
				});
			}(className))

			// Prevent users from selecting class tabs text
			listItemLink.setAttribute("class", className + " " + "noselect");

			listItem.appendChild(listItemLink);
			list.appendChild(listItem);
		}

		createClassTab('all');
		
		for (let className in classes)
			createClassTab(className)

		div.appendChild(list);
	}
	
	// Currently only handles control of the filter list.
	// Display is done in HTML (should add it here)
	function displayFilterList() {		
		// Init left filter list (filter sets described in HTML)
		let filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
		for (let i = 0; i < filterListLeft.length; i++) {
			let filterListItem = filterListLeft[i];
			
			// Set the initial filter as selected
			if (filterBySet === filterListItem.innerHTML.toLowerCase()) {
				filterListItem.classList.add("selected");
				
				//  In case element is part of a dropdown-menu
				let dropdown = filterListItem.parentElement.
					parentElement.childNodes[1];
					
				if (dropdown.getAttribute("data-toggle")) {
					dropdown.innerHTML = filterListItem.innerHTML;
					dropdown.classList.add("selected");
				}			
			}
			
			// Ignore clicks on the dropdown-menu itself
			if (filterListItem.getAttribute("data-toggle"))
				continue;
			
			// Closure function for when clicking on a filter
	        (function (filterListItem) {
			    filterListItem.addEventListener("click", function() {
					// Switch selected filter
					filterBySet = filterListItem.innerHTML.toLowerCase();
					
					// Deselect all other filters
					let filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
					for (let i = 0; i < filterListLeft.length; i++)
                      filterListLeft[i].classList.remove("selected");
				  
					//  In case element is part of a dropdown-menu
				    let dropdown = filterListItem.parentElement.
					    parentElement.childNodes[1];

					if (dropdown.getAttribute("data-toggle")) {
						dropdown.innerHTML = filterListItem.innerHTML;
						dropdown.classList.add("selected");
					}
						
				    filterListItem.classList.add("selected");
					
					// Display the cards and missing data with the new filter
					displayCards(selectedClass);
					displayMissingCards();
					displayMissingCardsOverall();
					displayMissingDust();
					displayMissingDustOverall();
					});
			}(filterListItem))
		}
		
		// Init right filter list. Currently only one button
		let filterListRight = document.getElementById("filtersRight").getElementsByTagName("a")[0];
		// Set the button as selected if the setting is turned on
		if (settings.showOnlyMissingCards)
			filterListRight.classList.add("selected");
		
		// Function for when clicking the showOnlyMissingCards button
	    filterListRight.addEventListener("click", function() {
			// Switch the setting and save the change locally
			settings.showOnlyMissingCards = !settings.showOnlyMissingCards;
			localStorage.setItem("settings", JSON.stringify(settings));
			
			// Display the new change in the CSS
			if (settings.showOnlyMissingCards)
			    filterListRight.classList.add("selected");
			else filterListRight.classList.remove("selected");
			
			// Display the cards with the new setting
			displayCards(selectedClass);
			});
	}
	
	// Displays the card lists for the specified class.
	// Created dynamically except for the list names
	function displayCards(className) {
		if (className == 'all')
			var cardList = classAll.cards;
		else
			var cardList = classes[className].cards;
		
		// One list for each rarity in the game
		for (var rarity in raritiesEnum) {
			// Empty the HTML lists
			let list = document.getElementById("list_" + rarity);
			while (list.firstChild)
				list.removeChild(list.firstChild);
			// TEMPORARY TO MAKE LISTS FIXED WIDTH WHEN EMPTY
			//list.innerHTML="&nbsp";
			
			// Init the "apply to all" button
			let listItem = document.createElement("li");
			let linkItemLink = document.createElement("a");
			linkItemLink.textContent = "Apply to all";
			linkItemLink.setAttribute("class", "buttonAll noselect");
			linkItemLink.addEventListener("click", function() { addAll(this); });
			linkItemLink.addEventListener("contextmenu", function() { removeAll(this); });
			listItem.appendChild(linkItemLink);
			list.appendChild(listItem);
			
			// Fill in list_free with common cards instead
			if (rarity == "free" && settings.hideFreeCards) {
				document.getElementById("list_free").setAttribute("class", "common");
				continue;
			}

			// Loop through all cards in the collection of the selected class.
			// List is already sorted
			for (let name in cardList[rarity]) {
				let card = cardList[rarity][name];
				
				// Only display the card if it isn't filtered out
				if (isVisible(card, filterBySet, settings)) {
					let listItem = document.createElement("li");
					let listItemLink = document.createElement("a");
					listItemLink.textContent = name;
					(function (card) {
						listItemLink.addEventListener("click", function() { addCard(card); });
						listItemLink.addEventListener("contextmenu", function() { removeCard(card); });
						}(card))
					// Set the CSS for the card depending on how many copies in the collection
					listItemLink.setAttribute("class", "normal" + cardList[rarity][name].normal + " " +
						"golden" + cardList[rarity][name].golden + " " + "noselect");

					listItem.appendChild(listItemLink);
					
					// Split common cards in two lists if hideFreeCards is on
					if (rarity == "common" && settings.hideFreeCards) {
						if (document.getElementById("list_free").getElementsByTagName("li").length <= 
								document.getElementById("list_common").getElementsByTagName("li").length)
							document.getElementById("list_free").appendChild(listItem);
						else list.appendChild(listItem);
					}
					else list.appendChild(listItem);
				}
			}
		}

		function isVisible(card, filterBySet, settings) {
			// Only display the card if show missing cards is off,
			// or the card is actually missing from your collection
			if (settings.showOnlyMissingCards) {
				if (settings.excludeGoldenCards) {
					if (card.normal >= getMaxCopies(rarity)) {
						return false;
					}
				} else {
					if (card.normal >= getMaxCopies(rarity) && card.golden >= getMaxCopies(rarity)) {
						return false;
					}
				}
			}
			if (filterBySet === "all") {
				return true;
			}
			if (filterBySet === "standard") {
				return !!standardSetsEnum[card.set];
			}
			return card.set === filterBySet;
		}
	}

	function getMissingDataFiltered(classData) {
		if (filterBySet === "all") {
			return classData.total;
		} else if (filterBySet === "standard") {
			let missingData = {};
			for (let set in standardSetsEnum) {
				let setData = classData[set];
				for (let rarity in setData) {
					if (!missingData[rarity]) {
						missingData[rarity] = {
							normal: 0,
							golden: 0
						};
					}
					missingData[rarity].normal += setData[rarity].normal;
					missingData[rarity].golden += setData[rarity].golden;
				}
			}
			return missingData;
		} else {
			return classData[filterBySet];
		}
	}

	// Displays the missing cards data for the selected class
	function displayMissingCards() {
		document.getElementById("missingCardsClassTitle").innerHTML = selectedClass.toUpperCase();
		
		if (selectedClass == 'all')
			var missingData = getMissingDataFiltered(missingCards.overall);
		else
			var missingData = getMissingDataFiltered(missingCards.classes[selectedClass]);

		// Hide Free column if hideFreeCards is enabled
		let table = document.getElementById("missingCardsTable");
		for (let i = 0; i < 8; i += 2) {
			let element = table.childNodes[1].childNodes[i].childNodes[1];
			if (settings.hideFreeCards)
				element.style.display = "none";
			else element.style.display = "block";
		}
		
		for (let rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
			let rarityCapitalized = capitalizeFirstLetter(rarity);
			let td = document.getElementById("classMissing" + rarityCapitalized + "Normal");
			let normal = missingData[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + rarityCapitalized + "Golden");
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingData[rarity].golden;
		}
	}
	
	// Displays the missing cards data overall
	function displayMissingCardsOverall() {
		let missingData = getMissingDataFiltered(missingCards.overall);
		
		// Hide Free column if hideFreeCards is enabled
		let table = document.getElementById("missingCardsOverallTable");
		for (let i = 0; i < 8; i += 2) {
			let element = table.childNodes[1].childNodes[i].childNodes[1];
			if (settings.hideFreeCards)
				element.style.display = "none";
			else element.style.display = "block";
		}
		
		for (let rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
			let rarityCapitalized = capitalizeFirstLetter(rarity);
			let td = document.getElementById("overallMissing" + rarityCapitalized + "Normal");
			let normal = missingData[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("overallMissing" + rarityCapitalized + "Golden");
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingData[rarity].golden;
		}
	}
	
	// Displays the missing dust data for the selected class
	function displayMissingDust() {
		if (selectedClass == 'all')
			var missingData = getMissingDataFiltered(missingDust.overall);
		else
			var missingData = getMissingDataFiltered(missingDust.classes[selectedClass]);

		for (let rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
			let rarityCapitalized = capitalizeFirstLetter(rarity);
			let td = document.getElementById("classMissingDust" + rarityCapitalized);
			let dust = 0;
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
				dust = missingData[rarity].normal;
			else dust = missingData[rarity].normal +
				missingData[rarity].golden;
			td.innerHTML = addThousandSeparator(dust);
		}
	}
	
	// Displays the missing dust data overall
	function displayMissingDustOverall() {
		let missingData = getMissingDataFiltered(missingDust.overall);
		
		for (let rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
			let rarityCapitalized = capitalizeFirstLetter(rarity);
			let td = document.getElementById("overallMissingDust" + rarityCapitalized);
			let dust = 0;
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
				dust = missingData[rarity].normal;
			else dust = missingData[rarity].normal +
				missingData[rarity].golden;
			td.innerHTML = addThousandSeparator(dust);
		}
	}
	
	// Toggles the exclude golden cards setting and updates view
	function toggleGoldenCards() {
		settings.excludeGoldenCards = !settings.excludeGoldenCards;
		localStorage.setItem("settings", JSON.stringify(settings));
		displayMissingDust();
		displayMissingDustOverall();
		displayMissingCards();
		displayMissingCardsOverall();
		displayCards(selectedClass);
	}
	
	// Toggles the exclude golden cards setting and updates view
	function toggleHideFreeCards() {
		settings.hideFreeCards = !settings.hideFreeCards;
		
		if (document.getElementById("list_free").getAttribute("class") == "free")
			document.getElementById("list_free").setAttribute("class", "common");
		else document.getElementById("list_free").setAttribute("class", "free");
		
		localStorage.setItem("settings", JSON.stringify(settings));
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}	
	
	// Creates and returns a table representing a deck.
	// The deck should be an object of cards with this format:
	//     "card name": cardCopies
	//		...
	// Deck and class names are optional.
	function createDeckTable(deck, deckName, className) {
		let cardData = getData("all-collectibles");
		let currentDust = {
			normal: 0,
			golden: 0
		};
		let totalDust = {
			normal: 0,
			golden: 0
		};		
		
		let table = document.createElement("table");
		table.setAttribute("class", "tableDeck");
		
		// Create deck name row
		let tr = document.createElement("tr");
		let td = document.createElement("td");
		td.classList.add("completion");
		td.setAttribute("colspan", 3);
		td.innerHTML = deckName || "Deck List";
		tr.appendChild(td);
		table.appendChild(tr);
		
		// Create card rows
		for (let cardName in deck) {
			let className = "";
			let rarity = "";
			//let image = "";
			
			// Get necessary card data
			for (let k = 0; k < cardData.cards.length; k++)
			    if (cardName == cardData.cards[k].name) {
					className = cardData.cards[k].hero;
					rarity = cardData.cards[k].quality;
					//image = cardData.cards[k].image_url;
					break;
				}
				
			let card = classes[className].cards[rarity][cardName];
			
			// Get card copies and dust owned/missing
			let copiesNormal = Math.min(card.normal, deck[cardName]);
			currentDust.normal += getCraftingCost(card, "normal", Math.min(card.normal, deck[cardName]));
			totalDust.normal += getCraftingCost(card, "normal", deck[cardName]);
			let copiesGolden = Math.min(card.golden, deck[cardName]);
			currentDust.golden += getCraftingCost(card, "golden", Math.min(card.golden, deck[cardName]));
			totalDust.golden += getCraftingCost(card, "golden", deck[cardName]);
			
			tr = document.createElement("tr");
			td = document.createElement("td");
			td.innerHTML = cardName;
			//td.style.background = "url('" + image + "') -70px -120px no-repeat";
			tr.appendChild(td);
			td = document.createElement("td");
			td.setAttribute("class", "normal");
			td.innerHTML = copiesNormal + "/" + deck[cardName];
			tr.appendChild(td);
			if (!settings.excludeGoldenCards) {
				td = document.createElement("td");
				td.setAttribute("class", "golden");
				td.innerHTML = copiesGolden + "/" + deck[cardName];
				tr.appendChild(td);
			}
			table.appendChild(tr);
		}
		
		// Create dust and progress row
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("class", "completion");
		if (!settings.excludeGoldenCards)
			td.innerHTML =  Math.floor((currentDust.normal + currentDust.golden) 
				/ (totalDust.normal + totalDust.golden) * 100) + "%";
		else td.innerHTML =  Math.floor(currentDust.normal / totalDust.normal * 100) + "%";
		tr.appendChild(td);
		td = document.createElement("td");
		td.setAttribute("class", "dust");
		td.innerHTML = totalDust.normal - currentDust.normal;
		tr.appendChild(td);
		if (!settings.excludeGoldenCards) {
			td = document.createElement("td");
			td.setAttribute("class", "dust");
			td.innerHTML = totalDust.golden - currentDust.golden;
			tr.appendChild(td);
		}
		table.appendChild(tr);
		
		return table;
	}
	/*********************************************************
	***********************PROGRESS PAGE**********************
	*********************************************************/
	// Displays a progress table for the selected set in the drop-down list
	function displayProgressTable(evt) {
		// Function is invoked by code when accessing the progress page,
		// which means evt is undefined and that the last selected table
		// should be displayed.
		if (evt != undefined) {
		    // Only display one table at all times
		    document.getElementById("containerRow").childNodes[1].removeChild(
		        document.getElementById("containerRow").childNodes[1].lastChild);
		
		    progressSet = evt.target.value;
		}
		else document.getElementById('select').value = progressSet;
		
		let table = createProgressTable(progressSet);
		
		document.getElementById("containerRow").childNodes[1].appendChild(table);
	}
	
	// Creates and returns a progress table of the specified set
	function createProgressTable(set) {
		let setList = {};
		if (set !== "standard")
	        setList[set] = set;
		else setList = standardSetsEnum;
		
		let rarities = {};
		for (let cardSet in setList)
			for (let rarity in setsCards[cardSet])
			    if (rarities[rarity] == undefined)
					rarities[rarity] = rarity;

		// Don't display an "all" column for sets only containing one rarity
		if (Object.keys(rarities).length != 1)
		    rarities.all = "all";
		
		let div = document.createElement("div");
		div.setAttribute("class", "table-responsive");
		
		let table = document.createElement("table");
		table.setAttribute("id", "progressTable");
		table.setAttribute("class", "table table-bordered");
		div.appendChild(table);
		
		// Create the header
		let tr = document.createElement("tr");
		let td = document.createElement("th");
		// Set the selected set as the header text
		td.innerHTML = document.getElementById('select').
			options[document.getElementById('select').selectedIndex].text.toUpperCase();
		td.setAttribute("colspan", 13);
		tr.appendChild(td);
		table.appendChild(tr);
		
		// Create rarities row
		tr = document.createElement("tr");
		tr.appendChild(document.createElement("td"));
		for (let rarity in rarities) {
			if (rarity == "free" && settings.hideFreeCards &&
   			    (set == "standard" || set == "total"))
				continue;
		    td = document.createElement("td");
		    td.innerHTML = capitalizeFirstLetter(rarity);
		    tr.appendChild(td);
		    tr.appendChild(document.createElement("td"));
		}
		
		table.appendChild(tr);
		
		// Create the class rows
		for (let className in classesEnum) {
			table.appendChild(createProgressTableRow("normal", setList, rarities, className));
			// Exclude golden data if the setting is on
			if (!settings.excludeGoldenCards)
			    table.appendChild(createProgressTableRow("golden", setList, rarities, className));
		}
		// Create the total rows
		table.appendChild(createProgressTableRow("normal", setList, rarities, "total"));
		if (!settings.excludeGoldenCards)
		    table.appendChild(createProgressTableRow("golden", setList, rarities, "total"));
		
		return div;
	}
	
	// Creates and returns a progress table row
	function createProgressTableRow(quality, sets, rarities, className) {
		let data = createProgressData(quality, sets, className);
		
		let tr = document.createElement("tr");
		tr.setAttribute("class", className);
		let td = document.createElement("td");
		
		// Only display the class name on the first (normal) row
		if (quality == "normal")
		    td.innerHTML = capitalizeFirstLetter(className);
		
		tr.appendChild(td);
		
		// Create data for all rarities
		for (let rarity in rarities) {
			if (rarity == "free" && settings.hideFreeCards &&
			    (sets == standardSetsEnum || sets.hasOwnProperty("total")))
				continue;
			// Create the card data
		    let td = document.createElement("td");
			let text = "-";
			let totalCards = data.totalCards[rarity];
			let missingCards = data.missingCards[rarity];

			// If there are collectible cards for this class/set/rarity
			if (totalCards != 0) {
				// Example: 0/50 (0%)
				text = totalCards - missingCards + "/" + totalCards +
				   	   " (" + Math.floor(((totalCards - missingCards) / totalCards) * 100) + "%)";
			
			}
		    td.innerHTML = text;
			tr.appendChild(td);
			
			// Create the dust data
			td = document.createElement("td");
			
			// If no collectible cards for this class/set/rarity or if they're uncraftable
			if (data.totalDust[rarity] == 0)
					text = "-";
			else {
				let totalDust = data.totalDust[rarity];
				let currentDust = totalDust - data.missingDust[rarity];
				// No need to display % here as it's the same as the card data %
				if (rarity !== "all")
                    text = " " + currentDust + "/" + totalDust;
				// But when combining rarities, display the %
				else text = " " + currentDust + "/" + totalDust +
				   " (" + Math.floor((currentDust / totalDust) * 100) + "%)";
			}
			td.innerHTML = text;
			tr.appendChild(td);
		}
		
		return tr;
	}
	/*********************************************************
	************************PACK GUIDE************************
	*********************************************************/
	// Displays the dust values for every pack
	function updatePackGuide() {
		let averageValue = 0;
		for (let set in packsEnum) {
			averageValue = calculatePackValue(set);
			
		    document.getElementById(set + "AverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
	}
	
	// Calculates and returns the dust value for a pack.
	// golden: True if pack is golden.
	// Needs more commenting
	function calculatePackValue(set, golden) {
		let averageValue = 0;
		
	    for (let rarity in chanceOfGetting) {
			// Value for guaranteed legendary, when any is missing (not 100% accurate)
			if (rarity == "legendary" && missingCards.overall[set][rarity].normal > 0 && missingCards.overall[set][rarity].golden > 0) {
				if (!golden) {
					averageValue += chanceOfGetting[rarity].normal * craftingCost[rarity].normal;
					if (!settings.excludeGoldenCards)
						averageValue += chanceOfGetting[rarity].golden * craftingCost[rarity].golden;
					else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
				}
				else {
					if (!settings.excludeGoldenCards)
						averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * craftingCost[rarity].golden;
					else averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * disenchantmentValue[rarity].golden;
				}
				continue;
			}
				
			let dupesNormal = 0, dupesGolden = 0;
			let totalCards = setsCards[set][rarity].total.cards / getMaxCopies(rarity);

			for (let className in classesEnum)
				for (let cardName in classes[className].cards[rarity]) {
					let card = classes[className].cards[rarity][cardName];
					
					if (card.set == set) {
						if (card.normal == getMaxCopies(rarity))
							dupesNormal++;
						if (card.golden == getMaxCopies(rarity))
							dupesGolden++;
					}
				}
			
			if (!golden) {
				averageValue += chanceOfGetting[rarity].normal * ((dupesNormal / totalCards) * disenchantmentValue[rarity].normal
					+ ((totalCards - dupesNormal) / totalCards) * craftingCost[rarity].normal);
				if (!settings.excludeGoldenCards)
					averageValue += chanceOfGetting[rarity].golden * ((dupesGolden / totalCards) * disenchantmentValue[rarity].golden
						+ ((totalCards - dupesGolden) / totalCards) * craftingCost[rarity].golden);
				else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
			}
			else {
				if (!settings.excludeGoldenCards)
					averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * ((dupesGolden / totalCards) * disenchantmentValue[rarity].golden
						+ ((totalCards - dupesGolden) / totalCards) * craftingCost[rarity].golden);
				else averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * disenchantmentValue[rarity].golden;
			}
		}
		return averageValue;
	}
	
	function updateChestGuide() {
		let averageDust = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		let total = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		let dupes = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		for (let set in rewardsEnum) {
		    for (let rarity in averageDust) {
				total[rarity] += setsCards[set][rarity].total.cards / getMaxCopies(rarity);
				
				for (let className in classesEnum)
					for (let cardName in classes[className].cards[rarity]) {
						let card = classes[className].cards[rarity][cardName];
						
						if (card.set == set)
							if (card.golden == getMaxCopies(rarity))
								dupes[rarity]++;
					}	
			}
		}
		
		for (let rarity in averageDust) {
		    if (!settings.excludeGoldenCards)
			    averageDust[rarity] += (dupes[rarity] / total[rarity]) * disenchantmentValue[rarity].golden
		            + ((total[rarity] - dupes[rarity]) / total[rarity]) * craftingCost[rarity].golden;
		    else averageDust[rarity] = disenchantmentValue[rarity].golden;
		}
		
		document.getElementById("chest20AverageDust").innerHTML = (averageDust.common + 5).toFixed(1);
		document.getElementById("chest15AverageDust").innerHTML = (averageDust.common + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest10AverageDust").innerHTML = (averageDust.common * 2 + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest5AverageDust").innerHTML = (averageDust.common * 2 + averageDust.epic + 5).toFixed(1);
		document.getElementById("chestLegendaryAverageDust").innerHTML = (averageDust.common * 3 + averageDust.epic).toFixed(1);
	}
	/*********************************************************
	**********************DECK RECIPES************************
	*********************************************************/
	// Displays deck recipes for the selected class in the drop-down list
	function displayDeckRecipes(evt) {
		let className = document.getElementById('selectRecipes').value;
		
		// Function is invoked by code when accessing the recipes page,
		// but otherwise the tables need to be removed each time a new
		// class is selected.
		if (evt != undefined) {
		    document.getElementById("containerRow").childNodes[1].removeChild(
		        document.getElementById("containerRow").childNodes[1].lastChild);
		}
		
		let recipes = getData("deck-recipes");
		
		let side = document.getElementsByClassName("side-page")[0];

		let div = document.createElement("div");
		div.setAttribute("class", "mainDiv");
		let div2 = document.createElement("div");
		div2.setAttribute("class", "row");
		for (let i = 0; i < recipes[className].length; i++) {
		    let div3 = document.createElement("div");
		    div3.setAttribute("class", "col");
		    div3.appendChild(createDeckTable(recipes[className][i].deck,
			    recipes[className][i].name));
		    div2.appendChild(div3);
		}
		div.appendChild(div2);
		side.appendChild(div);
	}
	/*********************************************************
	**********************HTML TEMPLATES**********************
	*********************************************************/
	function displayAbout() {
		let template = document.getElementById("template-about").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}

	function displayNews() {
		let template = document.getElementById("template-news").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		// If news page was updated, remove the news highlight when clicking on the button
		let news = document.getElementById("link-news");
		news.className = news.className.replace(" news", "");
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayPacks() {
		let template = document.getElementById("template-packs").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		if (setsCards === undefined)
			initSetsCards();
		
		updatePackGuide();
		updateChestGuide();
		
		document.getElementById("imageClassicPack").addEventListener("click", switchClassicPack);
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayRecipes() {
		let template = document.getElementById("template-recipes").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
			
		// Add an event listener to the drop-down list that will display deck recipes
		document.getElementById('selectRecipes').addEventListener('change', displayDeckRecipes);
		
		displayDeckRecipes();
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayTracker() {
		let template = document.getElementById("template-tracker").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		displayClassTabs();
		displayFilterList();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
		
		document.getElementById("checkboxGolden").addEventListener("change", toggleGoldenCards);
		document.getElementById("checkboxGolden").checked = settings.excludeGoldenCards;
		
		document.getElementById("checkboxHideFreeCards").addEventListener("change", toggleHideFreeCards);
		document.getElementById("checkboxHideFreeCards").checked = settings.hideFreeCards;
		
		// Make sure the quality buttons are visible while on the tracker
		document.getElementById("qualityButtons").style.visibility = "visible";
		
		// Disable the context menu when right-clicking while on the tracker
		document.oncontextmenu = function() {
            return false;
        }
	}
	
	function displayProgress() {
		let template = document.getElementById("template-progress");
		document.getElementById("containerRow").innerHTML = template.innerHTML;
		
		if (setsCards === undefined)
			initSetsCards();
		
		// Add an event listener to the drop-down list that will display a table
		document.getElementById('select').addEventListener('change', displayProgressTable);
		
		if (progressSet != "")
		    displayProgressTable();
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayImportHSReplay() {
		let template = document.getElementById("template-importHSReplay").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		// Add an event listener to the submit form
		document.getElementById('formImportHSReplay').addEventListener('submit', importHSReplay);
		
		document.getElementById("qualityButtons").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	/*********************************************************
	************************COLLECTION************************
	*********************************************************/
	// Loads data from a collection. Make sure it's the right
	// format, else handle potential errors
	function loadCollection(collection) {
		console.log("Loading collection...");
		for (let className in collection)
			// level here
			for (let rarity in collection[className].cards)
				for (let cardName in collection[className].cards[rarity]) {
					let cardCollection = classes[className].cards[rarity][cardName];
					let cardLoaded = collection[className].cards[rarity][cardName];
					
					// Ignore loaded cards that do not exist in the collection
					if (cardCollection !== undefined)
						for (let i = 0, quality = "normal"; i < 2; i++, quality = "golden")
						    updateCard(cardCollection, quality, cardLoaded[quality]);
				}
	}
	
	// Imports a collection from a JSON file
	function importCollection(event) {
	    let files = event.target.files; // FileList object

        let file = files[0]; // Selected file
        // Only process JSON files.
        if (!file.name.match(/[^\\]*\.(json)$/i)) {
			alert("Not a JSON file.");
            return;
        }

        let reader = new FileReader();

        // Closure to capture the file information
        reader.onload = (function(event) {
	        try {
			    let collection = JSON.parse(event.target.result);
				// Reset and load the collection
				resetCollection();
			    loadCollection(collection);
				updateLocalStorage();
				displayTracker();
		    }
		    catch(e) {
				if (e instanceof SyntaxError)
					alert("Invalid JSON file.");
				else if (e instanceof TypeError)
			        alert("Invalid HSCT file");
				else alert(e);
				
				return; // Abort import
		    }
        });

        // Read in the JSON file as text
		reader.readAsText(file);
	}
	
	// Exports the collection to a JSON file
	function exportCollection() {
		// Check for File API support
        if (window.Blob) {
		    let blob = new Blob([JSON.stringify(classes)],
				{ type: "text/plain;charset=utf-8;"} );
            saveAs(blob, "HSCT.json");
		} else alert('Exporting is not supported in this browser.');
	}
	
	function resetCollection() {
		for (let HSclass in classes)
			for (let quality in classes[HSclass].cards)
				for (let cardName in classes[HSclass].cards[quality]) {
					let card = classes[HSclass].cards[quality][cardName];
				
					if (card.normal != 0)
						updateCard(card, "normal", -card.normal);
					if (card.golden != 0)
						updateCard(card, "golden", -card.golden);
				}
	}
	
	// Imports a collection from HSReplay.
	// Event = formImportHSReplay onsubmit
	function importHSReplay(evt) {
		evt.preventDefault();
		
		document.getElementById('importHSReplayStatus').innerHTML =
		    "Please wait...";
		
		let url = evt.target["url"].value.split('/');
		let region = url[4];
		let lo = url[5];

		// Get the collection data
		fetch("/importHSReplay?lo=" + lo + "&region=" + region)
		  .then(response => response.json())
		  .then(collection => {	
			  getCardData().then((cardData) => {
				  resetCollection();
							
				  // Loop through the collection
				  for (let id in collection.collection) {
					  let name = "";
					  let className = "";
					  let rarity = "";
					  let copies = 0;
					  let quality = "";
				
					  // Get other necessary card data
					  for (let set in cardData)
						  for (let j = 0; j < cardData[set].length; j++) {
							  let card = cardData[set][j];

							  if (id == card.dbfId) {
								  name = card.name;
								  className = card.playerClass.toLowerCase();
								  rarity = card.rarity.toLowerCase();
								  break;
							  }
						  }
								
					  // Add the card info to HSCT
					  if (name != "" && className != "") {
						  let card = classes[className].cards[rarity][name];
									
						  updateCard(card, "normal", Math.min(collection.collection[id][0], getMaxCopies(rarity)));
						  updateCard(card, "golden", Math.min(collection.collection[id][1], getMaxCopies(rarity)));
					  }
				  }
							
				  document.getElementById('importHSReplayStatus').innerHTML =
					  "Collection imported successfully";
								
				  updateLocalStorage();
			  });
		  })
		  .catch(error => {
			  	document.getElementById('importHSReplayStatus').innerHTML =
					"Importing failed. Wrong URL or collection set to private";
		  });
	}
	
	function fix() {
		let xhttp = new XMLHttpRequest();
		xhttp.responseType = "json";
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				let result = xhttp.response;

				// Loop through the collection
				for (let i in result) {
					let hpid = i;
					let name = result[i];
					name = name.replace("&amp;#27;", "'");
					
					console.log('{"hpid":' + hpid + ',"set":"' + 'ros' + '","name":"' + name + '"},');
				
				}
			}
		};
		xhttp.open("GET", "http://localhost:3000/ids", true);
		xhttp.send();
	}
	/*********************************************************
	***********************MAIN FUNCTION**********************
	*********************************************************/
	return {
		init: function() {
			//console.log(JSON.stringify(localStorage).length);
			// Check for HTML5 storage support
			if (typeof(Storage) !== "undefined") {
				let storedVersion = localStorage.getItem("version");
				
				initHearthpwnTooltips();
				initSelectedQuality();
				initEventListeners();
				
				// If first visit or new version
				if (storedVersion != version) {
						getCardData().then((cardData) => {
							initCollection(cardData);
						
							// If new version, restore saved collection/settings
							if (parseFloat(storedVersion) < parseFloat(version)) {
								let storedCollection = JSON.parse(localStorage.getItem('classes'));
								let storedSettings = JSON.parse(localStorage.getItem('settings'));
								
								loadCollection(storedCollection);
								
								for (let setting in storedSettings)
									settings[setting] = storedSettings[setting];
								
								// Highlight the news button
								let news = document.getElementById("link-news");
								news.className = news.className + " news";
							}
							
							updateLocalStorage();
							localStorage.setItem("currentDust", currentDust);
							localStorage.setItem("disenchantedDust", disenchantedDust);
							localStorage.setItem("version", version);
							displayTracker();
						});
				}
				else {
					loadLocalStorage();
					initClassAll();
					displayTracker();
				}
			}
			//fix();
		}
	};
})();
window.onload = HSCollectionTracker.init();