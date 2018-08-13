function FilteringTag(str){
  var noTagText = str.replace(/(<([^>]+)>)/ig,"");
  return noTagText;
}

module.exports = {
  FilteringTag: (str)=>{
    return FilteringTag(str);
  }
}