const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'usage',
      targets: {
        node: 'current'
      },
      corejs: 3
    }
  ]
]

module.exports = {
  compact: true,
  comments: false,
  presets
}
