const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'usage',
      targets: {
        node: '12.18.1'
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
