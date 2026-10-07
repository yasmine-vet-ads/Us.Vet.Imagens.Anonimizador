export class ReviewState {
  processingRevision=0; outputRevision=-1; reviewedRevision=-1;
  invalidate(){this.processingRevision++;this.outputRevision=-1;this.reviewedRevision=-1;}
  processed(revision:number){if(revision===this.processingRevision){this.outputRevision=revision;this.reviewedRevision=-1;}}
  confirm(checked:boolean){this.reviewedRevision=checked&&this.outputRevision===this.processingRevision?this.outputRevision:-1;}
  get canExport(){return this.outputRevision>=0&&this.reviewedRevision===this.outputRevision&&this.outputRevision===this.processingRevision;}
}
