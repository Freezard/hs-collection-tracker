var HSCollectionTracker = (function() {

	function handleKey(element, event) {
	  var a = String.fromCharCode(event.keyCode);
	  console.log(a); 
	  console.log(element.parentNode.innerText.split(" ")[0]);
	  if (/\d/.test(a)) {
		  if (window.getSelection().type == "Range")
			  if (element.innerHTML.length <= 2)
				  return true;
			  else return false;
		  
		  else if (element.innerHTML.length + 1 <= 2)
			return true;
		}
	  return false;
	}
	function lol(e) {
	   window.getSelection().removeAllRanges();
	   /*document.selection.empty()*/
	   console.log(e);
		//e.innerHTML = "lol";
	}
	/*$('span[contenteditable]').keydown(function(e) {
		// trap the return key being pressed
		if (e.keyCode === 13) {
		  // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
		  //document.execCommand('insertHTML', false, '<br><br>');
		  document.getElementById("a").blur();
		  // prevent the default behaviour of return key pressed
		  return false;
		}
	  });*/
	  
	var classesEnum = {
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
		
	var raritiesEnum = {
		free: "free",
		common: "common",
		rare: "rare",
		epic: "epic",
		legendary: "legendary"
	};
		
	var setsEnum = {
		basic: 133,
		classic: 245,
		reward: 2,
		promo: 2,
		naxxramas: 30,
		gvg: 123,
		blackrock: 31
	};

	var missingCardsTotal = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0],
	};

	var classes = null;

	var selectedClass = "neutral";
	var selectedCardQuality = "normal";
		
	function card(name, rarity, mana, type, set, soulbound) {
		this.name = name;
		this.rarity = rarity;
		this.mana = mana;
		this.type = type;
		this.set = set;
		this.soulbound = soulbound;
		this.normal = 0;
		this.golden = 0;
	}
		
	function class_(name) {
		this.name = name;
		this.level = 1;
		this.cards = { 
			free: {},
			common: {},
			rare: {},
			epic: {},
			legendary: {}
		};
		this.missingCards = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0],
	};
		this.addCard = function(card) {
			this.cards[card.rarity][card.name] = card;
			
			if ([card.rarity] != "legendary") {
				this.missingCards[card.rarity][0] += 2;
				this.missingCards[card.rarity][1] += 2;
				this.missingCards.total[0] += 2;
				this.missingCards.total[1] += 2;
				
				missingCardsTotal[card.rarity][0] += 2;
				missingCardsTotal[card.rarity][1] += 2;
				missingCardsTotal.total[0] += 2;
				missingCardsTotal.total[1] += 2;
			}
			else {
				this.missingCards[card.rarity][0] += 1;
				this.missingCards[card.rarity][1] += 1;
				this.missingCards.total[0] += 1;
				this.missingCards.total[1] += 1;
				
				missingCardsTotal[card.rarity][0] += 1;
				missingCardsTotal[card.rarity][1] += 1;
				missingCardsTotal.total[0] += 1;
				missingCardsTotal.total[1] += 1;
			}
		}
	}

	function sortCards(b) {
		var cardList = classes[b].cards;
		for (var rarity in cardList) {
			var sortedList = [];
			for (var a in cardList[rarity]) {
				sortedList.push([a, cardList[rarity][a]]);
			}
			sortedList.sort(function(a, b) { return a[1].mana == b[1].mana ? a[1].name.localeCompare(b[1].name) : a[1].mana - b[1].mana });
		
			var rv = {};
			for (var i = 0; i < sortedList.length; ++i)
				if (sortedList[i] !== undefined)
					rv[sortedList[i][0]] = sortedList[i][1];
		
			cardList[rarity] = rv;
		}
	}
		
	function addCard(element, card) {
		card[selectedCardQuality]++;
		
		var re = new RegExp(selectedCardQuality + "\\d");
		
		element.setAttribute("class", element.getAttribute("class").replace(re, selectedCardQuality + card[selectedCardQuality]));
		
		if (selectedCardQuality == "normal") {
			classes[selectedClass].missingCards[card.rarity][0]--;
			missingCardsTotal[card.rarity][0]--;
		}
		else {
			classes[selectedClass].missingCards[card.rarity][1]--;
			missingCardsTotal[card.rarity][1]--;
		}
		
		localStorage.setItem('testObject', JSON.stringify(classes));
		localStorage.setItem('total', JSON.stringify(missingCardsTotal));
		
		var b = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);
		var c = selectedCardQuality.charAt(0).toUpperCase() + selectedCardQuality.slice(1);
		var td = document.getElementById("classMissing" + b + c);
		td.innerHTML -= 1;
		td = document.getElementById("totalMissing" + b + c);
		td.innerHTML -= 1;
		
		return true;
	}
		
	function displayClassTabs() {
		var div = document.getElementById("classTabs");
		var list = document.createElement("ul");
		document.getElementById("classTabsBar").setAttribute("class", selectedClass);
			
		for (var class__ in classes) {
			var listItem = document.createElement("li");
			var listItemLink = document.createElement("a");
			var span = document.createElement("span");
			span.innerHTML = classes[class__].level;
				
			span.setAttribute("contenteditable", true);
			/* BECAUSE EVENT LISTENERS NO WORKY ON THIS SPAN.
			   USE FORM INSTEAD? */
			span.setAttribute("onkeypress", "return handleKey(this, event)");
			span.setAttribute("onblur", "lol(this)");
			span.setAttribute("onpaste", "return false");
			span.setAttribute("ondrop", "return false");
			/* --------------------------------------------- */
			listItemLink.appendChild(span);
			if (class__ === "neutral")
				listItemLink.innerHTML = class__;
			else {
				listItemLink.innerHTML = class__ + "<br>(" + listItemLink.innerHTML;
				listItemLink.innerHTML += ")";
			}
			(function (class__) {
				listItemLink.addEventListener("click", function() { document.getElementById("classTabsBar").setAttribute("class", class__); selectedClass = class__; displayCards(class__); displayMissingCards(); });
				}(class__))
				listItemLink.setAttribute("class", class__ + " " + "noselect");
				
				listItem.appendChild(listItemLink);
				list.appendChild(listItem);
		}
		div.appendChild(list);
	}
		
	function displayCards(a) {
		var cardList = classes[a].cards;
			
		for (var a in raritiesEnum) {
			var list = document.getElementById("list_" + a);		
			while (list.firstChild) {
				list.removeChild(list.firstChild);
			}
			// TEMPORARY TO MAKE LISTS FIXED WIDTH WHEN EMPTY
			//list.innerHTML="&nbsp";
		}
		
		for (var rarity in cardList) {		    
			var list = document.getElementById("list_" + rarity);
			for (var card in cardList[rarity]) {
				var card__ = cardList[rarity][card];
				var listItem = document.createElement("li");
				var listItemLink = document.createElement("a");
				listItemLink.textContent = card;
				(function (card__) {
					listItemLink.addEventListener("click", function() { addCard(this, card__); });
					}(card__))
					listItemLink.setAttribute("class", "normal" + cardList[rarity][card].normal + " " + "golden" + cardList[rarity][card].golden + " " + "noselect");
			
					listItem.appendChild(listItemLink);
					list.appendChild(listItem);
			}
		}
	}
		
	function displayMissingCards() {
		document.getElementById("classMissingTitle").innerHTML = selectedClass.toUpperCase();
		for (var a in classes[selectedClass].missingCards) {
			var b = a.charAt(0).toUpperCase() + a.slice(1);
			var td = document.getElementById("classMissing" + b + "Normal");
			var normal = classes[selectedClass].missingCards[a][0];
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + b + "Golden");
			td.innerHTML = classes[selectedClass].missingCards[a][1];
		}
	}

	function displayMissingCardsTotal() {
		for (var a in missingCardsTotal) {
			var b = a.charAt(0).toUpperCase() + a.slice(1);
			var td = document.getElementById("totalMissing" + b + "Normal");
			var normal = missingCardsTotal[a][0];
			td.innerHTML = normal;
			td = document.getElementById("totalMissing" + b + "Golden");
			td.innerHTML = missingCardsTotal[a][1];	
		}
	}

	function initializeClasses() {
		classes = {};
		for (var class__ in classesEnum)
			classes[class__] = new class_(class__);
	}
		
	function importCards(file) {
		var cardData = readTextFile(file);
		cardData = cardData.replace(/(\r)/gm, "");
		var cardLines = cardData.split("\n");
		var cardClass;
		var i;
		for (i = 0; i < cardLines.length; i++) {
			var cardLine = cardLines[i].split(",");
			if (cardLine.length == 1 && cardLine != "") {
				cardClass = cardLine[0];
			}
			else if (cardLine != "") {
				classes[cardClass].addCard(new card(cardLine[0], cardLine[1], cardLine[2]));
			}
		}
	}
		
	function readTextFile(file) {
		var rawFile;
		var allText = "";
		if (window.XMLHttpRequest) {
			// code for IE7+, Firefox, Chrome, Opera, Safari
			rawFile = new XMLHttpRequest();
		}
		else {
			// code for IE6, IE5
			rawFile = new ActiveXObject("Microsoft.XMLHTTP");
		}
		rawFile.open("GET", "data/" + file, false);
		rawFile.onreadystatechange = function () {
			if(rawFile.readyState === 4) {
				if(rawFile.status === 200 || rawFile.status == 0) {
					allText = rawFile.responseText;
				}
			}
		}
		rawFile.send(null);
			
		return allText;
	}

	function initSelectedCardQuality() {		
		var a = document.getElementById("selectedQualityNormal");
		var b = document.getElementById("selectedQualityGolden");
		
		a.addEventListener("click", function() { setSelectedCardQuality(this); });
		b.addEventListener("click", function() { setSelectedCardQuality(this); });
    }

    function setSelectedCardQuality(element) {
		if (element.getAttribute("id") === "selectedQualityNormal")
			document.getElementById("selectedQualityGolden").removeAttribute("class");
		else document.getElementById("selectedQualityNormal").removeAttribute("class");
		
		selectedCardQuality = element.innerHTML.toLowerCase();
		element.setAttribute("class", "selected");
    }
	
	return {
		init: function() {	
		//localStorage.clear();
		console.log(JSON.stringify(localStorage).length);
		
		if (typeof(Storage) !== "undefined") {
			var retrievedObject = localStorage.getItem('testObject');
			classes = JSON.parse(retrievedObject);

		} else {
			// Sorry! No Web Storage support..
		}	
		
		if (classes == null) {
			initializeClasses();
			
			importCards("basic.txt");
			importCards("classic.txt");
			importCards("reward.txt");
			importCards("promo.txt");
			importCards("naxxramas.txt");
			
			for (var iii in classes) {
				sortCards(iii);
			}
			
			localStorage.setItem('testObject', JSON.stringify(classes));
			localStorage.setItem('total', JSON.stringify(missingCardsTotal));
		}
		else {
			var fei = localStorage.getItem("total");
			missingCardsTotal = JSON.parse(fei);
		}
		
		initSelectedCardQuality();
		displayClassTabs();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsTotal();
	    }
	};
})();

window.onload = HSCollectionTracker.init();

//alert(Object.keys(classEnum).length);