function test1(){
  geminiSearch(["ontrack"]);
}

function test2(){
  synthesizeAndCreateDeck(['NeedEnergy']);
}


function test3(){
  let prompt;
   Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && (value.searchGroup != '' && value.searchGroup != undefined)){
      prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
    }
   });
   console.log(prompt);
}