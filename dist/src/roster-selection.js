// Selection stays independent of the visible page and of the match's opponent.
export class RosterSelection {
  constructor(count,pageSize=12){this.count=count;this.pageSize=pageSize;this.selected=0;this.page=0;}
  get pages(){return Math.ceil(this.count/this.pageSize);}
  get visible(){return Array.from({length:Math.min(this.pageSize,this.count-this.page*this.pageSize)},(_,i)=>this.page*this.pageSize+i);}
  choose(index){
    if(!Number.isInteger(index)||index<0||index>=this.count)return false;
    this.selected=index;this.page=Math.floor(index/this.pageSize);return true;
  }
  turn(delta){this.page=Math.max(0,Math.min(this.pages-1,this.page+delta));}
  resize(pageSize){if(this.pageSize!==pageSize){this.pageSize=pageSize;this.page=Math.floor(this.selected/pageSize);}}
}
