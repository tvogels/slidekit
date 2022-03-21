Syntax 
  = id:Id? attributes:Attribute* 
  { return { id, attributes} }

Attribute
  = [\s]* "[" key: AttributeKey value: AttributeValue? "]" 
  { return {key, value} }

AttributeValue
  = "=" x:ValueString 
  { return x; }

AttributeKey
  = [a-zA-Z0-9-_]+ 
  { return text(); }

ValueString
  = Id

Id
  = [^\[\]]+ 
  { return text(); }
