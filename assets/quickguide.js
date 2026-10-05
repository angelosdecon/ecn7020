// The "R quick guide" panel that opens on every problem-set page.
// Edit the text here and it changes everywhere.

export default `
<h2>R quick guide</h2>
<p class="qg-lead">The few things you need to read and write R in this module. Keep this panel open while you work.</p>

<h3>What R and RStudio are</h3>
<p><b>R</b> is a programming language for working with data: you type an instruction, R carries it out and shows the result. <b>RStudio</b> is the program most people use to write R on their own computer. It gives you a place to write code, a place to see results, a list of your data and a window for graphs.</p>
<p>On this page you do not need either: the dark box is where you write code, <b>Run</b> carries it out, and the result appears underneath.</p>

<h3>How an R instruction is built</h3>
<pre>result &lt;- round(mean(temps), digits = 1)</pre>
<table>
<tr><td><code>mean(temps)</code></td><td>A <b>function</b> (<code>mean</code>) applied to an <b>object</b> (<code>temps</code>). The brackets hold what the function works on.</td></tr>
<tr><td><code>round(..., digits = 1)</code></td><td>Functions can sit inside one another: R works from the inside out. <code>digits = 1</code> is a named <b>argument</b>; arguments are separated by commas.</td></tr>
<tr><td><code>result &lt;-</code></td><td><code>&lt;-</code> stores the answer under a name you choose. Nothing is printed when you store something.</td></tr>
</table>
<p>To see what is stored, type its name on a line of its own:</p>
<pre>result</pre>

<h3>Five rules of the language</h3>
<ol>
<li><b>One instruction per line.</b> R runs them from top to bottom.</li>
<li><b>Capital letters matter.</b> <code>mean</code> works; <code>Mean</code> does not. <code>gdp</code> and <code>GDP</code> are different objects.</li>
<li><b>Every bracket and quotation mark needs a partner.</b> <code>( )</code> for functions, <code>[ ]</code> for picking out values, <code>" "</code> around text.</li>
<li><b>Text goes in quotation marks, names do not.</b> <code>"UK"</code> is a piece of text; <code>UK</code> would be an object called UK.</li>
<li><b>Anything after <code>#</code> is a comment.</b> R ignores it. Use it to say what a step is for.</li>
</ol>

<h3>Basic commands</h3>
<table>
<tr><th>To do this</th><th>Write</th></tr>
<tr><td>Arithmetic</td><td><code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>^</code> and <code>sqrt()</code></td></tr>
<tr><td>Store a value</td><td><code>x &lt;- 5</code></td></tr>
<tr><td>A list of numbers (a vector)</td><td><code>c(4, 8, 15)</code></td></tr>
<tr><td>A sequence</td><td><code>1:5</code>, <code>seq(10, 60, by = 10)</code></td></tr>
<tr><td>How many values</td><td><code>length(x)</code></td></tr>
<tr><td>Add up, average</td><td><code>sum(x)</code>, <code>mean(x)</code>, <code>median(x)</code></td></tr>
<tr><td>Spread</td><td><code>var(x)</code>, <code>sd(x)</code>, <code>range(x)</code></td></tr>
<tr><td>Round</td><td><code>round(x, 1)</code></td></tr>
<tr><td>Count each value</td><td><code>table(x)</code></td></tr>
<tr><td>Running total</td><td><code>cumsum(x)</code></td></tr>
</table>

<h3>Tables of data (data frames)</h3>
<p>A data frame is a table: each row is an observation, each column a variable.</p>
<table>
<tr><th>To do this</th><th>Write</th></tr>
<tr><td>See the first rows</td><td><code>head(gdp)</code></td></tr>
<tr><td>See the columns and their types</td><td><code>str(gdp)</code></td></tr>
<tr><td>Pick one column</td><td><code>gdp$Country</code></td></tr>
<tr><td>Pick rows that meet a condition</td><td><code>gdp[gdp$Country == "UK", ]</code></td></tr>
<tr><td>Add a column</td><td><code>d$total &lt;- d$a + d$b</code></td></tr>
<tr><td>A statistic for each group</td><td><code>tapply(values, groups, mean)</code></td></tr>
</table>
<p>Inside square brackets the pattern is <code>[rows, columns]</code>. Leaving the part after the comma empty means "all columns".</p>

<h3>Comparisons</h3>
<p><code>==</code> equal to (two equals signs), <code>!=</code> not equal to, <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code>, <code>&amp;</code> and, <code>|</code> or. A single <code>=</code> is only for naming arguments.</p>

<h3>Graphs</h3>
<pre>hist(x, main = "Title", xlab = "Label")
boxplot(values ~ group, data = d)
plot(x, y)
barplot(counts)</pre>

<h3>When you get an error</h3>
<table>
<tr><td><code>object 'x' not found</code></td><td>A name is misspelt, has the wrong capitals, or was created in an earlier step you have not run.</td></tr>
<tr><td><code>could not find function</code></td><td>The function name is misspelt or has the wrong capitals.</td></tr>
<tr><td><code>unexpected symbol</code> or <code>unexpected ')'</code></td><td>A comma, bracket or quotation mark is missing or extra.</td></tr>
<tr><td>The answer is <code>NA</code></td><td>The data have missing values: add <code>na.rm = TRUE</code>.</td></tr>
</table>
<p>Errors are normal. Read the message, fix one thing, and run again.</p>
`;
